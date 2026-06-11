#include "crow.h"
#include <nlohmann/json.hpp>
#include <openssl/hmac.h>
#include <openssl/evp.h>
#include <openssl/crypto.h>

#include <chrono>
#include <cstdlib>
#include <ctime>
#include <iomanip>
#include <iostream>
#include <mutex>
#include <optional>
#include <sstream>
#include <string>
#include <unordered_map>

using json = nlohmann::json;

// =============================================================================
// JWT HS256 Verification
//
// Replicates what Node.js jsonwebtoken does by default:
//   jwt.sign(payload, process.env.JWT_SECRET)  →  HS256, no required issuer
//   jwt.verify(token, process.env.JWT_SECRET)  →  checks signature + exp
//
// Implemented with raw OpenSSL so we need no extra C++ JWT library, and the
// shared JWT_SECRET is the only coupling point to the Node.js server.
// =============================================================================

static std::string base64url_decode(const std::string& in) {
    std::string b64 = in;
    for (auto& c : b64) {
        if (c == '-') c = '+';
        else if (c == '_') c = '/';
    }
    while (b64.size() % 4) b64 += '=';

    BIO* chain = BIO_push(
        BIO_new(BIO_f_base64()),
        BIO_new_mem_buf(b64.data(), static_cast<int>(b64.size()))
    );
    BIO_set_flags(chain, BIO_FLAGS_BASE64_NO_NL);

    std::string decoded(b64.size(), '\0');
    const int len = BIO_read(chain, decoded.data(), static_cast<int>(decoded.size()));
    BIO_free_all(chain);

    if (len <= 0) return {};
    decoded.resize(static_cast<size_t>(len));
    return decoded;
}

// Returns the "id" claim string from a valid HS256 JWT, or nullopt on any
// failure (bad signature, expired, missing id claim, malformed).
static std::optional<std::string>
verify_jwt(const std::string& token, const std::string& secret) {
    const auto d1 = token.find('.');
    if (d1 == std::string::npos) return std::nullopt;
    const auto d2 = token.find('.', d1 + 1);
    if (d2 == std::string::npos) return std::nullopt;

    // Defence in depth: reject anything that doesn't explicitly declare HS256,
    // so an attacker can't downgrade to "none" or attempt RS256→HS256 confusion.
    const std::string header_str = base64url_decode(token.substr(0, d1));
    try {
        const auto header = json::parse(header_str);
        if (!header.contains("alg") || header["alg"] != "HS256") return std::nullopt;
    } catch (...) {
        return std::nullopt;
    }

    // signing_input = "base64url(header).base64url(payload)"
    const std::string signing_input = token.substr(0, d2);
    const std::string sig_b64url    = token.substr(d2 + 1);

    unsigned char hmac_bytes[EVP_MAX_MD_SIZE];
    unsigned int  hmac_len = 0;
    HMAC(EVP_sha256(),
         secret.data(),        static_cast<int>(secret.size()),
         reinterpret_cast<const unsigned char*>(signing_input.data()),
         static_cast<int>(signing_input.size()),
         hmac_bytes, &hmac_len);

    const std::string expected(reinterpret_cast<const char*>(hmac_bytes), hmac_len);
    const std::string actual = base64url_decode(sig_b64url);

    // Constant-time compare prevents timing side-channel attacks
    if (expected.size() != actual.size() ||
        CRYPTO_memcmp(expected.data(), actual.data(), expected.size()) != 0)
        return std::nullopt;

    const std::string payload_str =
        base64url_decode(token.substr(d1 + 1, d2 - d1 - 1));
    try {
        const auto payload = json::parse(payload_str);

        if (payload.contains("exp")) {
            const auto exp = payload["exp"].get<int64_t>();
            const auto now = std::chrono::duration_cast<std::chrono::seconds>(
                                 std::chrono::system_clock::now().time_since_epoch())
                                 .count();
            if (now > exp) return std::nullopt;
        }

        if (!payload.contains("id") || !payload["id"].is_string())
            return std::nullopt;

        return payload["id"].get<std::string>();
    } catch (...) {
        return std::nullopt;
    }
}

// =============================================================================
// Thread-safe Connection Registry
//
// Maps user_id (MongoDB ObjectId string) → active WebSocket connection pointer.
// A single mutex guards the map; Crow dispatches callbacks from a thread pool.
//
// Per-connection user ID is stored in Crow's conn.userdata() slot (set during
// the onaccept phase) so we only need a single-direction map here.
// =============================================================================

class Registry {
public:
    void add(const std::string& uid, crow::websocket::connection* conn) {
        std::lock_guard<std::mutex> lk(mtx_);
        by_user_[uid] = conn;
    }

    // Only erase if the stored connection is the one actually closing. A late
    // onclose from a stale socket must not evict a newer connection that has
    // since reconnected under the same uid (multi-tab / backoff reconnect).
    void remove(const std::string& uid, crow::websocket::connection* conn) {
        std::lock_guard<std::mutex> lk(mtx_);
        auto it = by_user_.find(uid);
        if (it != by_user_.end() && it->second == conn) by_user_.erase(it);
    }

    // Sends payload to uid's connection. Returns false if the user is offline.
    bool deliver(const std::string& uid, const std::string& payload) {
        std::lock_guard<std::mutex> lk(mtx_);
        auto it = by_user_.find(uid);
        if (it == by_user_.end()) return false;
        it->second->send_text(payload);
        return true;
    }

private:
    mutable std::mutex mtx_;
    std::unordered_map<std::string, crow::websocket::connection*> by_user_;
};

// =============================================================================
// Helpers
// =============================================================================

static std::string utc_now_iso8601() {
    const auto tt = std::chrono::system_clock::to_time_t(
        std::chrono::system_clock::now());
    // gmtime_s, not std::gmtime: this runs on Crow's worker threads and
    // std::gmtime returns a shared static buffer that concurrent calls race on.
    std::tm tm{};
    gmtime_s(&tm, &tt);
    std::ostringstream ss;
    ss << std::put_time(&tm, "%Y-%m-%dT%H:%M:%SZ");
    return ss.str();
}

// Safely read the user ID that was stored in conn.userdata() during onaccept.
static const std::string* uid_of(crow::websocket::connection& conn) {
    return static_cast<const std::string*>(conn.userdata());
}

// =============================================================================
// Entry Point
// =============================================================================

int main() {
    const char* env_secret = std::getenv("JWT_SECRET");
    if (!env_secret || *env_secret == '\0') {
        std::cerr << "[FATAL] JWT_SECRET environment variable is not set.\n"
                  << "        Set it to the same value used by the Node.js server.\n";
        return 1;
    }
    const std::string jwt_secret(env_secret);

    Registry registry;
    crow::SimpleApp app;

    // ─────────────────────────────────────────────────────────────────────────
    // WebSocket endpoint:  ws://localhost:8080/?token=<JWT>
    //
    // Message protocol (all frames are JSON):
    //   Client → Server   { "to": "<userId>", "text": "<message>", "type": "text|audio" }
    //   Server → Client   { "type": "message", "msgType": "text|audio", "from": "...", "text": "...", "timestamp": "..." }
    //   Server → Client   { "type": "connected",   "userId": "..." }         (on open)
    //   Server → Client   { "type": "undelivered", "to": "...", "reason": "User is offline" }
    //   Server → Client   { "type": "error",       "message": "..." }
    // ─────────────────────────────────────────────────────────────────────────
    CROW_WEBSOCKET_ROUTE(app, "/")

        // ── Accept phase: runs during HTTP→WS upgrade ────────────────────────
        // Verify the JWT from the query string before the handshake completes.
        // The user ID is heap-allocated here and stored in conn.userdata();
        // it is freed in onclose after the connection is removed from the registry.
        .onaccept([&](const crow::request& req, void** userdata) -> bool {
            const char* raw = req.url_params.get("token");
            if (!raw || *raw == '\0') return false;

            auto maybe_uid = verify_jwt(std::string(raw), jwt_secret);
            if (!maybe_uid) return false;

            // Lifetime: allocated here, deleted in onclose
            *userdata = new std::string(std::move(*maybe_uid));
            return true;
        })

        // ── Open: WebSocket handshake complete ───────────────────────────────
        .onopen([&](crow::websocket::connection& conn) {
            const std::string* uid_ptr = uid_of(conn);
            if (!uid_ptr) return;
            const std::string& uid = *uid_ptr;

            registry.add(uid, &conn);

            json welcome;
            welcome["type"]   = "connected";
            welcome["userId"] = uid;
            conn.send_text(welcome.dump());

            std::cout << "[INFO ] connected:    " << uid << '\n';
        })

        // ── Message: route JSON frames between users ─────────────────────────
        .onmessage([&](crow::websocket::connection& conn,
                       const std::string& data,
                       bool /*is_binary*/) {
            const std::string* uid_ptr = uid_of(conn);
            if (!uid_ptr) return;
            const std::string& sender = *uid_ptr;

            json msg;
            try {
                msg = json::parse(data);
            } catch (...) {
                conn.send_text(R"({"type":"error","message":"Invalid JSON"})");
                return;
            }

            if (!msg.contains("to")   || !msg["to"].is_string() ||
                !msg.contains("text") || !msg["text"].is_string()) {
                conn.send_text(
                    R"({"type":"error","message":"Message must have string fields 'to' and 'text'"})");
                return;
            }

            const std::string recipient = msg["to"].get<std::string>();
            const std::string text      = msg["text"].get<std::string>();

            // Content type of the message ("text" | "audio", default "text").
            // The C++ service stays content-agnostic: for an audio note `text`
            // is simply the protected URL string, and we forward msgType so the
            // recipient knows to render a player instead of a text bubble. The
            // frame-level "type" field below stays "message" (the envelope kind).
            std::string msg_type = "text";
            if (msg.contains("type") && msg["type"].is_string()) {
                msg_type = msg["type"].get<std::string>();
            }

            json envelope;
            envelope["type"]      = "message";
            envelope["msgType"]   = msg_type;
            envelope["from"]      = sender;
            envelope["text"]      = text;
            envelope["timestamp"] = utc_now_iso8601();

            if (!registry.deliver(recipient, envelope.dump())) {
                json nack;
                nack["type"]   = "undelivered";
                nack["to"]     = recipient;
                nack["reason"] = "User is offline";
                conn.send_text(nack.dump());
            }
        })

        // ── Close: clean up registry and free the user ID ────────────────────
        .onclose([&](crow::websocket::connection& conn, const std::string& reason) {
            auto* uid_ptr = static_cast<std::string*>(conn.userdata());
            if (!uid_ptr) return;

            registry.remove(*uid_ptr, &conn);
            std::cout << "[INFO ] disconnected: " << *uid_ptr
                      << " (" << reason << ")\n";

            delete uid_ptr;
            conn.userdata(nullptr);
        });

    constexpr int PORT = 8080;
    std::cout << "[INFO ] Click & Pick realtime service starting on port "
              << PORT << '\n';
    app.port(PORT).multithreaded().run();
    return 0;
}
