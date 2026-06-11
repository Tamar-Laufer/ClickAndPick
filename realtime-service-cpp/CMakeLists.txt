cmake_minimum_required(VERSION 3.16)
project(realtime_service_cpp CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(FetchContent)
find_package(Threads REQUIRED)

# ── OpenSSL (system dependency — needed for HMAC-SHA256 JWT verification) ────
#   Linux:   sudo apt install libssl-dev
#   macOS:   brew install openssl  (may need -DOPENSSL_ROOT_DIR=$(brew --prefix openssl))
#   Windows: vcpkg install openssl:x64-windows  OR  choco install openssl
find_package(OpenSSL REQUIRED)

# ── Asio (standalone async I/O, required by Crow) ─────────────────────────────
FetchContent_Declare(asio
  GIT_REPOSITORY https://github.com/chriskohlhoff/asio.git
  GIT_TAG        asio-1-28-2
  GIT_SHALLOW    TRUE
)
FetchContent_MakeAvailable(asio)

# Expose as asio::asio so Crow can link it
add_library(asio_standalone INTERFACE)
add_library(asio::asio ALIAS asio_standalone)
target_include_directories(asio_standalone INTERFACE
  $<BUILD_INTERFACE:${asio_SOURCE_DIR}/asio/include>
)
target_compile_definitions(asio_standalone INTERFACE ASIO_STANDALONE)
target_link_libraries(asio_standalone INTERFACE Threads::Threads)

# Crow ships its own Findasio.cmake that searches for ASIO_INCLUDE_DIR.
# Set it as a CACHE variable so find_path() honours it without a system search.
set(ASIO_INCLUDE_DIR "${asio_SOURCE_DIR}/asio/include" CACHE PATH "Asio include dir" FORCE)
set(asio_FOUND TRUE CACHE BOOL "" FORCE)
set(Asio_FOUND TRUE CACHE BOOL "" FORCE)

# ── Crow (header-only HTTP + WebSocket framework) ────────────────────────────
set(CROW_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(CROW_BUILD_TESTS    OFF CACHE BOOL "" FORCE)
set(CROW_USE_BOOST      OFF CACHE BOOL "" FORCE)
# Disable Crow's install() rules — we use it as a build-only FetchContent dep,
# so we don't want it trying to export our private asio_standalone target.
set(CROW_INSTALL        OFF CACHE BOOL "" FORCE)
FetchContent_Declare(Crow
  GIT_REPOSITORY https://github.com/CrowCpp/Crow.git
  GIT_TAG        v1.2.0
  GIT_SHALLOW    TRUE
)
FetchContent_MakeAvailable(Crow)

# ── nlohmann/json (header-only JSON library) ─────────────────────────────────
set(JSON_BuildTests OFF CACHE BOOL "" FORCE)
FetchContent_Declare(nlohmann_json
  GIT_REPOSITORY https://github.com/nlohmann/json.git
  GIT_TAG        v3.11.3
  GIT_SHALLOW    TRUE
)
FetchContent_MakeAvailable(nlohmann_json)

# ── Executable ────────────────────────────────────────────────────────────────
add_executable(realtime_service main.cpp)

target_link_libraries(realtime_service PRIVATE
  Crow::Crow
  asio_standalone
  nlohmann_json::nlohmann_json
  OpenSSL::SSL
  OpenSSL::Crypto
  Threads::Threads
)

# Windows requires these socket / crypto import libraries
if(WIN32)
  target_link_libraries(realtime_service PRIVATE ws2_32 mswsock crypt32)
endif()

# Compiler flags
if(MSVC)
  target_compile_options(realtime_service PRIVATE
    /utf-8          # Interpret source files as UTF-8 (fixes C4566 in Crow headers)
    /wd4996         # Suppress OpenSSL 3.x HMAC deprecation warning
    /D_WIN32_WINNT=0x0601   # Target Windows 7+ (Asio requirement)
  )
else()
  target_compile_options(realtime_service PRIVATE -Wno-deprecated-declarations)
  target_compile_definitions(realtime_service PRIVATE _WIN32_WINNT=0x0601)
endif()
