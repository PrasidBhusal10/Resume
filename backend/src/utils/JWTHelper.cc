#include "JWTHelper.h"
#include <openssl/hmac.h>
#include <openssl/evp.h>
#include <json/json.h>
#include <ctime>
#include <cstdlib>
#include <stdexcept>
#include <sstream>

std::string JWTHelper::secret() {
    const char* s = std::getenv("JWT_SECRET");
    return s ? s : "fallback-dev-secret-change-in-prod";
}

std::string JWTHelper::base64UrlEncode(const std::string& input) {
    static const char table[] =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    std::string out;
    int val = 0, valb = -6;
    for (unsigned char c : input) {
        val = (val << 8) + c;
        valb += 8;
        while (valb >= 0) {
            out.push_back(table[(val >> valb) & 0x3F]);
            valb -= 6;
        }
    }
    if (valb > -6) out.push_back(table[((val << 8) >> (valb + 8)) & 0x3F]);
    while (out.size() % 4) out.push_back('=');
    // URL-safe replacements
    for (char& c : out) {
        if (c == '+') c = '-';
        else if (c == '/') c = '_';
    }
    // strip padding
    while (!out.empty() && out.back() == '=') out.pop_back();
    return out;
}

std::string JWTHelper::base64UrlDecode(const std::string& input) {
    std::string b64 = input;
    for (char& c : b64) {
        if (c == '-') c = '+';
        else if (c == '_') c = '/';
    }
    while (b64.size() % 4) b64 += '=';

    std::string out;
    static const int lookup[256] = {
        -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
        -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
        -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,62,-1,-1,-1,63,
        52,53,54,55,56,57,58,59,60,61,-1,-1,-1,-1,-1,-1,
        -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9,10,11,12,13,14,
        15,16,17,18,19,20,21,22,23,24,25,-1,-1,-1,-1,-1,
        -1,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,
        41,42,43,44,45,46,47,48,49,50,51,-1,-1,-1,-1,-1,
    };
    int val = 0, valb = -8;
    for (unsigned char c : b64) {
        if (lookup[c] == -1) break;
        val = (val << 6) + lookup[c];
        valb += 6;
        if (valb >= 0) {
            out.push_back(char((val >> valb) & 0xFF));
            valb -= 8;
        }
    }
    return out;
}

std::string JWTHelper::hmacSha256(const std::string& msg, const std::string& key) {
    unsigned char hash[EVP_MAX_MD_SIZE];
    unsigned int  hashLen;
    HMAC(EVP_sha256(),
         key.data(),   static_cast<int>(key.size()),
         reinterpret_cast<const unsigned char*>(msg.data()),
         msg.size(),
         hash, &hashLen);
    return std::string(reinterpret_cast<char*>(hash), hashLen);
}

std::string JWTHelper::sign(const JWTClaims& claims, int expireSeconds) {
    // Header
    Json::Value header;
    header["alg"] = "HS256";
    header["typ"] = "JWT";
    Json::FastWriter fw;
    std::string headerB64 = base64UrlEncode(fw.write(header));
    // strip newline FastWriter appends
    if (!headerB64.empty() && headerB64.back() == '\n') headerB64.pop_back();

    // Payload
    Json::Value payload;
    payload["sub"]       = static_cast<Json::UInt64>(claims.userId);
    payload["email"]     = claims.email;
    payload["premium"]   = claims.isPremium;
    payload["iat"]       = static_cast<Json::Int64>(std::time(nullptr));
    payload["exp"]       = static_cast<Json::Int64>(std::time(nullptr) + expireSeconds);
    std::string payloadStr  = fw.write(payload);
    std::string payloadB64  = base64UrlEncode(payloadStr);

    // Signature
    std::string sigInput = headerB64 + "." + payloadB64;
    std::string sig      = base64UrlEncode(hmacSha256(sigInput, secret()));

    return sigInput + "." + sig;
}

std::optional<JWTClaims> JWTHelper::verify(const std::string& token) {
    auto dot1 = token.find('.');
    auto dot2 = token.find('.', dot1 + 1);
    if (dot1 == std::string::npos || dot2 == std::string::npos) return std::nullopt;

    std::string sigInput = token.substr(0, dot2);
    std::string sigGiven = token.substr(dot2 + 1);
    std::string sigExpected = base64UrlEncode(hmacSha256(sigInput, secret()));
    if (sigGiven != sigExpected) return std::nullopt;

    std::string payloadJson = base64UrlDecode(token.substr(dot1 + 1, dot2 - dot1 - 1));
    Json::Value payload;
    Json::Reader reader;
    if (!reader.parse(payloadJson, payload)) return std::nullopt;

    int64_t exp = payload["exp"].asInt64();
    if (exp < static_cast<int64_t>(std::time(nullptr))) return std::nullopt;

    JWTClaims c;
    c.userId    = payload["sub"].asUInt64();
    c.email     = payload["email"].asString();
    c.isPremium = payload["premium"].asBool();
    return c;
}
