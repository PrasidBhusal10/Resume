#include <drogon/drogon.h>
#include <string>
#include <cstdlib>

#include "controllers/AuthController.h"
#include "controllers/ResumeController.h"
#include "controllers/TemplateController.h"
#include "controllers/JDController.h"
#include "controllers/ExportController.h"

int main() {
    // Read env vars (docker-compose injects these)
    auto getenv_or = [](const char* key, const char* def) -> std::string {
        const char* v = std::getenv(key);
        return v ? v : def;
    };

    const std::string dbHost   = getenv_or("DB_HOST",  "127.0.0.1");
    const std::string dbPort   = getenv_or("DB_PORT",  "3306");
    const std::string dbName   = getenv_or("DB_NAME",  "resume_optimizer");
    const std::string dbUser   = getenv_or("DB_USER",  "resumeuser");
    const std::string dbPass   = getenv_or("DB_PASS",  "resumepass");
    const std::string redisHost= getenv_or("REDIS_HOST","127.0.0.1");
    const std::string redisPort= getenv_or("REDIS_PORT","6379");

    // ── MySQL ─────────────────────────────────────────────────────────────────
    auto dbClient = drogon::orm::DbClient::newMysqlClient(
        "host=" + dbHost + " port=" + dbPort +
        " dbname=" + dbName + " user=" + dbUser + " password=" + dbPass,
        10  // connection pool size
    );
    drogon::app().setDbClient(dbClient);

    // ── CORS ──────────────────────────────────────────────────────────────────
    drogon::app().registerPreRoutingAdvice([](const drogon::HttpRequestPtr& req,
                                              drogon::FilterCallback&& cb,
                                              drogon::FilterChainCallback&& ccb) {
        if (req->method() == drogon::Options) {
            auto resp = drogon::HttpResponse::newHttpResponse();
            resp->addHeader("Access-Control-Allow-Origin",  "*");
            resp->addHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
            resp->addHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
            cb(resp);
            return;
        }
        ccb();
    });

    drogon::app().registerPostHandlingAdvice([](const drogon::HttpRequestPtr&,
                                                const drogon::HttpResponsePtr& resp) {
        resp->addHeader("Access-Control-Allow-Origin", "*");
    });

    // ── Routes ────────────────────────────────────────────────────────────────
    drogon::app()
        .registerController(std::make_shared<AuthController>())
        .registerController(std::make_shared<ResumeController>())
        .registerController(std::make_shared<TemplateController>())
        .registerController(std::make_shared<JDController>())
        .registerController(std::make_shared<ExportController>());

    drogon::app()
        .setLogLevel(trantor::Logger::kInfo)
        .addListener("0.0.0.0", 8080)
        .setThreadNum(0)  // 0 = #CPU cores
        .run();

    return 0;
}
