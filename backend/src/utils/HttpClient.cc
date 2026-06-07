#include "HttpClient.h"
#include <drogon/HttpClient.h>
#include <drogon/drogon.h>
#include <trantor/utils/Logger.h>
#include <future>

HttpResponse HttpClient::post(const std::string& url,
                               const Json::Value&  payload,
                               int timeoutMs) {
    // Parse host + path from url
    std::string host, path;
    auto schemeEnd = url.find("://");
    auto rest      = url.substr(schemeEnd + 3);
    auto slashPos  = rest.find('/');
    host = rest.substr(0, slashPos);
    path = slashPos == std::string::npos ? "/" : rest.substr(slashPos);

    bool useSSL = url.substr(0, schemeEnd) == "https";

    std::promise<HttpResponse> p;
    auto fut = p.get_future();

    auto client = drogon::HttpClient::newHttpClient(
        (useSSL ? "https://" : "http://") + host);
    client->setTimeout(timeoutMs / 1000);

    auto req = drogon::HttpRequest::newHttpJsonRequest(payload);
    req->setMethod(drogon::Post);
    req->setPath(path);

    client->sendRequest(req,
        [prom = std::move(p)](drogon::ReqResult res,
                               const drogon::HttpResponsePtr& resp) mutable {
            HttpResponse out;
            if (res == drogon::ReqResult::Ok && resp) {
                out.statusCode = resp->statusCode();
                if (resp->jsonObject()) {
                    out.body = *resp->jsonObject();
                }
            } else {
                out.statusCode = 503;
                out.body["error"] = "AI service unavailable";
            }
            prom.set_value(std::move(out));
        });

    return fut.get();
}

HttpResponse HttpClient::get(const std::string& url, int timeoutMs) {
    std::string host, path;
    auto schemeEnd = url.find("://");
    auto rest      = url.substr(schemeEnd + 3);
    auto slashPos  = rest.find('/');
    host = rest.substr(0, slashPos);
    path = slashPos == std::string::npos ? "/" : rest.substr(slashPos);
    bool useSSL = url.substr(0, schemeEnd) == "https";

    std::promise<HttpResponse> p;
    auto fut = p.get_future();

    auto client = drogon::HttpClient::newHttpClient(
        (useSSL ? "https://" : "http://") + host);
    client->setTimeout(timeoutMs / 1000);

    auto req = drogon::HttpRequest::newHttpRequest();
    req->setMethod(drogon::Get);
    req->setPath(path);

    client->sendRequest(req,
        [prom = std::move(p)](drogon::ReqResult res,
                               const drogon::HttpResponsePtr& resp) mutable {
            HttpResponse out;
            if (res == drogon::ReqResult::Ok && resp) {
                out.statusCode = resp->statusCode();
                if (resp->jsonObject()) out.body = *resp->jsonObject();
            } else {
                out.statusCode = 503;
            }
            prom.set_value(std::move(out));
        });

    return fut.get();
}
