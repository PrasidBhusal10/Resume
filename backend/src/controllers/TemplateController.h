#pragma once
#include <drogon/HttpController.h>

class TemplateController : public drogon::HttpController<TemplateController> {
public:
    METHOD_LIST_BEGIN
        ADD_METHOD_TO(TemplateController::listTemplates, "/api/templates",     drogon::Get);
        ADD_METHOD_TO(TemplateController::getTemplate,   "/api/templates/{id}", drogon::Get);
    METHOD_LIST_END

    void listTemplates(const drogon::HttpRequestPtr&, std::function<void(const drogon::HttpResponsePtr&)>&&);
    void getTemplate  (const drogon::HttpRequestPtr&, std::function<void(const drogon::HttpResponsePtr&)>&&, int id);
};
