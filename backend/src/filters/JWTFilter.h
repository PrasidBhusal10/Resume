#pragma once
#include <drogon/HttpFilter.h>

// Applies to any route that requires authentication.
// Reads the Authorization: Bearer <token> header,
// validates it, and injects `userId` into the request attributes.
class JWTFilter : public drogon::HttpFilter<JWTFilter> {
public:
    void doFilter(const drogon::HttpRequestPtr& req,
                  drogon::FilterCallback&&      cb,
                  drogon::FilterChainCallback&& ccb) override;
};
