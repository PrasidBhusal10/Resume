#pragma once
#include <drogon/HttpController.h>

class ResumeController : public drogon::HttpController<ResumeController> {
public:
    METHOD_LIST_BEGIN
        ADD_METHOD_TO(ResumeController::createResume,    "/api/resumes",                       drogon::Post,   "JWTFilter");
        ADD_METHOD_TO(ResumeController::listResumes,     "/api/resumes",                       drogon::Get,    "JWTFilter");
        ADD_METHOD_TO(ResumeController::getResume,       "/api/resumes/{id}",                  drogon::Get,    "JWTFilter");
        ADD_METHOD_TO(ResumeController::updateResume,    "/api/resumes/{id}",                  drogon::Put,    "JWTFilter");
        ADD_METHOD_TO(ResumeController::deleteResume,    "/api/resumes/{id}",                  drogon::Delete, "JWTFilter");
        ADD_METHOD_TO(ResumeController::updateSection,   "/api/resumes/{id}/sections/{type}",  drogon::Put,    "JWTFilter");
        ADD_METHOD_TO(ResumeController::reorderSections, "/api/resumes/{id}/sections/reorder", drogon::Put,    "JWTFilter");
    METHOD_LIST_END

    void createResume   (const drogon::HttpRequestPtr&, std::function<void(const drogon::HttpResponsePtr&)>&&, uint64_t id);
    void listResumes    (const drogon::HttpRequestPtr&, std::function<void(const drogon::HttpResponsePtr&)>&&);
    void getResume      (const drogon::HttpRequestPtr&, std::function<void(const drogon::HttpResponsePtr&)>&&, uint64_t id);
    void updateResume   (const drogon::HttpRequestPtr&, std::function<void(const drogon::HttpResponsePtr&)>&&, uint64_t id);
    void deleteResume   (const drogon::HttpRequestPtr&, std::function<void(const drogon::HttpResponsePtr&)>&&, uint64_t id);
    void updateSection  (const drogon::HttpRequestPtr&, std::function<void(const drogon::HttpResponsePtr&)>&&, uint64_t id, std::string type);
    void reorderSections(const drogon::HttpRequestPtr&, std::function<void(const drogon::HttpResponsePtr&)>&&, uint64_t id);
};
