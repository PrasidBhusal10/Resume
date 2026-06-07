#pragma once
#include <string>
#include <optional>
#include <cstdint>

struct JWTClaims {
    uint64_t    userId;
    std::string email;
    bool        isPremium;
};

class JWTHelper {
public:
    // Returns a signed JWT token valid for `expireSeconds`
    static std::string sign(const JWTClaims& claims, int expireSeconds = 86400 * 7);

    // Verifies and decodes a token; returns nullopt on failure
    static std::optional<JWTClaims> verify(const std::string& token);

private:
    static std::string secret();          // reads JWT_SECRET env var
    static std::string base64UrlEncode(const std::string& input);
    static std::string base64UrlDecode(const std::string& input);
    static std::string hmacSha256(const std::string& msg, const std::string& key);
};
