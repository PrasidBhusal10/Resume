#pragma once
#include <drogon/HttpController.h>

class AuthController : public drogon::HttpController<AuthController> {
public:
    METHOD_LIST_BEGIN
        ADD_METHOD_TO(AuthController::registerUser, "/api/auth/register", drogon::Post);
        ADD_METHOD_TO(AuthController::login,        "/api/auth/login",    drogon::Post);
        ADD_METHOD_TO(AuthController::me,           "/api/auth/me",       drogon::Get,
                      "JWTFilter");
    METHOD_LIST_END

    void registerUser(const drogon::HttpRequestPtr& req,
                      std::function<void(const drogon::HttpResponsePtr&)>&& cb);

    void login(const drogon::HttpRequestPtr& req,
               std::function<void(const drogon::HttpResponsePtr&)>&& cb);

    void me(const drogon::HttpRequestPtr& req,
            std::function<void(const drogon::HttpResponsePtr&)>&& cb);

private:
    static std::string hashPassword(const std::string& pw);
    static bool verifyPassword(const std::string& pw, const std::string& hash);
};
