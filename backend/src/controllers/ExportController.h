#pragma once
#include <drogon/HttpController.h>

class ExportController : public drogon::HttpController<ExportController> {
public:
    METHOD_LIST_BEGIN
        ADD_METHOD_TO(ExportController::exportPDF,      "/api/export/{resumeId}/pdf",      drogon::Post, "JWTFilter");
        ADD_METHOD_TO(ExportController::exportDOCX,     "/api/export/{resumeId}/docx",     drogon::Post, "JWTFilter");
        ADD_METHOD_TO(ExportController::exportTEX,      "/api/export/{resumeId}/tex",      drogon::Post, "JWTFilter");
        ADD_METHOD_TO(ExportController::downloadExport, "/api/export/{exportId}/download", drogon::Get,  "JWTFilter");
    METHOD_LIST_END

    void exportPDF     (const drogon::HttpRequestPtr&, std::function<void(const drogon::HttpResponsePtr&)>&&, uint64_t resumeId);
    void exportDOCX    (const drogon::HttpRequestPtr&, std::function<void(const drogon::HttpResponsePtr&)>&&, uint64_t resumeId);
    void exportTEX     (const drogon::HttpRequestPtr&, std::function<void(const drogon::HttpResponsePtr&)>&&, uint64_t resumeId);
    void downloadExport(const drogon::HttpRequestPtr&, std::function<void(const drogon::HttpResponsePtr&)>&&, uint64_t exportId);

private:
    void doExport(const drogon::HttpRequestPtr& req,
                  std::function<void(const drogon::HttpResponsePtr&)>&& cb,
                  uint64_t resumeId, const std::string& format);
};
