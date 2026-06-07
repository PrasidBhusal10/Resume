#pragma once
#include <string>
#include <optional>
#include <json/json.h>

// Thin synchronous HTTP client wrapping Drogon's async client.
// Used by controllers to call the Python AI microservice.
struct HttpResponse {
    int         statusCode;
    Json::Value body;
};

class HttpClient {
public:
    static HttpResponse post(const std::string& url,
                             const Json::Value&  payload,
                             int timeoutMs = 30000);

    static HttpResponse get(const std::string& url,
                            int timeoutMs = 10000);
};
