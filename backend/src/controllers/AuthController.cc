#include "AuthController.h"
#include "utils/JWTHelper.h"
#include <drogon/orm/DbClient.h>
#include <openssl/sha.h>
#include <openssl/rand.h>
#include <iomanip>
#include <sstream>

// Simple SHA-256 + salt password hashing.
// In production, swap for bcrypt (add libbcrypt dependency).
std::string AuthController::hashPassword(const std::string& pw) {
    unsigned char salt[16];
    RAND_bytes(salt, sizeof(salt));

    std::ostringstream saltHex;
    for (auto b : salt) saltHex << std::hex << std::setw(2) << std::setfill('0') << (int)b;
    std::string saltStr = saltHex.str();

    std::string salted = saltStr + pw;
    unsigned char hash[SHA256_DIGEST_LENGTH];
    SHA256(reinterpret_cast<const unsigned char*>(salted.c_str()), salted.size(), hash);

    std::ostringstream hashHex;
    for (auto b : hash) hashHex << std::hex << std::setw(2) << std::setfill('0') << (int)b;
    return saltStr + ":" + hashHex.str();
}

bool AuthController::verifyPassword(const std::string& pw, const std::string& storedHash) {
    auto sep = storedHash.find(':');
    if (sep == std::string::npos) return false;
    std::string salt = storedHash.substr(0, sep);
    std::string expected = storedHash.substr(sep + 1);

    std::string salted = salt + pw;
    unsigned char hash[SHA256_DIGEST_LENGTH];
    SHA256(reinterpret_cast<const unsigned char*>(salted.c_str()), salted.size(), hash);

    std::ostringstream hashHex;
    for (auto b : hash) hashHex << std::hex << std::setw(2) << std::setfill('0') << (int)b;
    return hashHex.str() == expected;
}

void AuthController::registerUser(const drogon::HttpRequestPtr& req,
                                   std::function<void(const drogon::HttpResponsePtr&)>&& cb) {
    auto json = req->getJsonObject();
    if (!json || !(*json)["email"] || !(*json)["password"]) {
        Json::Value err; err["error"] = "email and password are required";
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        cb(resp); return;
    }

    std::string email    = (*json)["email"].asString();
    std::string password = (*json)["password"].asString();
    std::string name     = (*json)["name"].asString();

    if (email.empty() || password.size() < 8) {
        Json::Value err; err["error"] = "Password must be at least 8 characters";
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        cb(resp); return;
    }

    std::string hashed = hashPassword(password);
    auto db = drogon::app().getDbClient();

    db->execSqlAsync(
        "INSERT INTO users (email, password_hash, name) VALUES (?,?,?)",
        [cb, email](const drogon::orm::Result&) {
            Json::Value res; res["message"] = "Account created successfully";
            cb(drogon::HttpResponse::newHttpJsonResponse(res));
        },
        [cb](const drogon::orm::DrogonDbException& e) {
            std::string msg = e.base().what();
            Json::Value err;
            err["error"] = msg.find("Duplicate") != std::string::npos
                           ? "Email already registered"
                           : "Registration failed";
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k409Conflict);
            cb(resp);
        },
        email, hashed, name
    );
}

void AuthController::login(const drogon::HttpRequestPtr& req,
                            std::function<void(const drogon::HttpResponsePtr&)>&& cb) {
    auto json = req->getJsonObject();
    if (!json || !(*json)["email"] || !(*json)["password"]) {
        Json::Value err; err["error"] = "email and password are required";
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        cb(resp); return;
    }

    std::string email    = (*json)["email"].asString();
    std::string password = (*json)["password"].asString();
    auto db = drogon::app().getDbClient();

    db->execSqlAsync(
        "SELECT id, password_hash, name, is_premium FROM users WHERE email = ? LIMIT 1",
        [cb, password, email](const drogon::orm::Result& r) {
            if (r.empty()) {
                Json::Value err; err["error"] = "Invalid credentials";
                auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                resp->setStatusCode(drogon::k401Unauthorized);
                cb(resp); return;
            }
            auto row = r[0];
            if (!verifyPassword(password, row["password_hash"].as<std::string>())) {
                Json::Value err; err["error"] = "Invalid credentials";
                auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                resp->setStatusCode(drogon::k401Unauthorized);
                cb(resp); return;
            }

            JWTClaims claims;
            claims.userId    = row["id"].as<uint64_t>();
            claims.email     = email;
            claims.isPremium = row["is_premium"].as<bool>();

            std::string token = JWTHelper::sign(claims);
            Json::Value res;
            res["token"]     = token;
            res["user"]["id"]        = static_cast<Json::UInt64>(claims.userId);
            res["user"]["email"]     = email;
            res["user"]["name"]      = row["name"].as<std::string>();
            res["user"]["isPremium"] = claims.isPremium;
            cb(drogon::HttpResponse::newHttpJsonResponse(res));
        },
        [cb](const drogon::orm::DrogonDbException& e) {
            Json::Value err; err["error"] = "Database error";
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k500InternalServerError);
            cb(resp);
        },
        email
    );
}

void AuthController::me(const drogon::HttpRequestPtr& req,
                         std::function<void(const drogon::HttpResponsePtr&)>&& cb) {
    uint64_t userId = req->attributes()->get<uint64_t>("userId");
    auto db = drogon::app().getDbClient();

    db->execSqlAsync(
        "SELECT id, email, name, avatar_url, is_premium, created_at FROM users WHERE id = ?",
        [cb](const drogon::orm::Result& r) {
            if (r.empty()) {
                Json::Value err; err["error"] = "User not found";
                auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                resp->setStatusCode(drogon::k404NotFound);
                cb(resp); return;
            }
            auto row = r[0];
            Json::Value user;
            user["id"]        = static_cast<Json::UInt64>(row["id"].as<uint64_t>());
            user["email"]     = row["email"].as<std::string>();
            user["name"]      = row["name"].as<std::string>();
            user["avatarUrl"] = row["avatar_url"].isNull() ? Json::Value() : row["avatar_url"].as<std::string>();
            user["isPremium"] = row["is_premium"].as<bool>();
            cb(drogon::HttpResponse::newHttpJsonResponse(user));
        },
        [cb](const drogon::orm::DrogonDbException&) {
            Json::Value err; err["error"] = "Database error";
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k500InternalServerError);
            cb(resp);
        },
        userId
    );
}
