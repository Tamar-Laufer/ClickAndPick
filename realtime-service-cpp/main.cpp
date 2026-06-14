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

static std::optional<std::string>
verify_jwt(const std::string& token, const std::string& secret) {
    const auto d1 = token.find('.');
    if (d1 == std::string::npos) return std::nullopt;
    const auto d2 = token.find('.', d1 + 1);
    if (d2 == std::string::npos) return std::nullopt;

    const std::string header_str = base64url_decode(token.substr(0, d1));
    try {
        const auto header = json::parse(header_str);
        if (!header.contains("alg") || header["alg"] != "HS256") return std::nullopt;
    } catch (...) {
        return std::nullopt;
    }

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


class Registry {
public:
    void add(const std::string& uid, crow::websocket::connection* conn) {
        std::lock_guard<std::mutex> lk(mtx_);
        by_user_[uid] = conn;
    }

    void remove(const std::string& uid, crow::websocket::connection* conn) {
        std::lock_guard<std::mutex> lk(mtx_);
        auto it = by_user_.find(uid);
        if (it != by_user_.end() && it->second == conn) by_user_.erase(it);
    }

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


static std::string utc_now_iso8601() {
    const auto tt = std::chrono::system_clock::to_time_t(
        std::chrono::system_clock::now());
    std::tm tm{};
    gmtime_s(&tm, &tt);
    std::ostringstream ss;
    ss << std::put_time(&tm, "%Y-%m-%dT%H:%M:%SZ");
    return ss.str();
}

static const std::string* uid_of(crow::websocket::connection& conn) {
    return static_cast<const std::string*>(conn.userdata());
}


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

    CROW_WEBSOCKET_ROUTE(app, "/")

        .onaccept([&](const crow::request& req, void** userdata) -> bool {
            const char* raw = req.url_params.get("token");
            if (!raw || *raw == '\0') return false;

            auto maybe_uid = verify_jwt(std::string(raw), jwt_secret);
            if (!maybe_uid) return false;

            *userdata = new std::string(std::move(*maybe_uid));
            return true;
        })

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

        .onmessage([&](crow::websocket::connection& conn,
                       const std::string& data,
                       bool) {
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
