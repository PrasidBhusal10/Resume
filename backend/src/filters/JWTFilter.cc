#include "JWTFilter.h"
#include "utils/JWTHelper.h"
#include <drogon/HttpResponse.h>

void JWTFilter::doFilter(const drogon::HttpRequestPtr& req,
                          drogon::FilterCallback&&      cb,
                          drogon::FilterChainCallback&& ccb) {
    std::string auth = req->getHeader("Authorization");
    if (auth.size() < 8 || auth.substr(0, 7) != "Bearer ") {
        auto resp = drogon::HttpResponse::newHttpJsonResponse(
            Json::Value({{"error", "Missing or malformed Authorization header"}}));
        resp->setStatusCode(drogon::k401Unauthorized);
        cb(resp);
        return;
    }

    auto claims = JWTHelper::verify(auth.substr(7));
    if (!claims) {
        auto resp = drogon::HttpResponse::newHttpJsonResponse(
            Json::Value({{"error", "Invalid or expired token"}}));
        resp->setStatusCode(drogon::k401Unauthorized);
        cb(resp);
        return;
    }

    // Inject claims into request attributes for downstream controllers
    req->attributes()->insert("userId",    claims->userId);
    req->attributes()->insert("userEmail", claims->email);
    req->attributes()->insert("isPremium", claims->isPremium);
    ccb();
}
