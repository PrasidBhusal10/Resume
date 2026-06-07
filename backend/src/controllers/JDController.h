#pragma once
#include <drogon/HttpController.h>

class JDController : public drogon::HttpController<JDController> {
public:
    METHOD_LIST_BEGIN
        ADD_METHOD_TO(JDController::analyzeJD,   "/api/jd/analyze",             drogon::Post, "JWTFilter");
        ADD_METHOD_TO(JDController::optimizeResume, "/api/optimize/{resumeId}", drogon::Post, "JWTFilter");
        ADD_METHOD_TO(JDController::acceptSession,  "/api/optimize/{sessionId}/accept", drogon::Post, "JWTFilter");
        ADD_METHOD_TO(JDController::rejectSession,  "/api/optimize/{sessionId}/reject", drogon::Post, "JWTFilter");
    METHOD_LIST_END

    void analyzeJD     (const drogon::HttpRequestPtr&, std::function<void(const drogon::HttpResponsePtr&)>&&);
    void optimizeResume(const drogon::HttpRequestPtr&, std::function<void(const drogon::HttpResponsePtr&)>&&, uint64_t resumeId);
    void acceptSession (const drogon::HttpRequestPtr&, std::function<void(const drogon::HttpResponsePtr&)>&&, uint64_t sessionId);
    void rejectSession (const drogon::HttpRequestPtr&, std::function<void(const drogon::HttpResponsePtr&)>&&, uint64_t sessionId);
};
