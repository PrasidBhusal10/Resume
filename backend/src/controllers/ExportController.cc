#include "ExportController.h"
#include "exporters/TeXExporter.h"
#include "exporters/DOCXExporter.h"
#include <drogon/orm/DbClient.h>
#include <fstream>
#include <filesystem>
#include <chrono>
#include <cstdlib>

namespace fs = std::filesystem;

static std::string storagePath() {
    const char* p = std::getenv("FILE_STORAGE_PATH");
    return p ? p : "/app/storage";
}

// Load full resume data from DB and trigger export
void ExportController::doExport(const drogon::HttpRequestPtr& req,
                                 std::function<void(const drogon::HttpResponsePtr&)>&& cb,
                                 uint64_t resumeId, const std::string& format) {
    uint64_t userId = req->attributes()->get<uint64_t>("userId");
    auto db = drogon::app().getDbClient();

    db->execSqlAsync(
        "SELECT r.id, r.title, r.template_id, t.tex_source "
        "FROM resumes r JOIN templates t ON r.template_id = t.id "
        "WHERE r.id = ? AND r.user_id = ?",
        [cb, db, resumeId, format, userId](const drogon::orm::Result& rrows) {
            if (rrows.empty()) {
                Json::Value err; err["error"] = "Resume not found";
                auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                resp->setStatusCode(drogon::k404NotFound);
                cb(resp); return;
            }

            std::string texSource = rrows[0]["tex_source"].as<std::string>();
            std::string title     = rrows[0]["title"].as<std::string>();

            db->execSqlAsync(
                "SELECT section_type, section_order, content, is_visible "
                "FROM resume_sections WHERE resume_id = ? ORDER BY section_order",
                [cb, db, resumeId, format, title, texSource, userId]
                (const drogon::orm::Result& srows) {
                    // Also fetch the user's personal info
                    db->execSqlAsync(
                        "SELECT name, email FROM users WHERE id = ?",
                        [cb, db, resumeId, format, title, texSource, srows]
                        (const drogon::orm::Result& urows) {
                            ResumeData resume;
                            resume.name      = urows[0]["name"].as<std::string>();
                            resume.email     = urows[0]["email"].as<std::string>();
                            resume.title     = title;
                            resume.texSource = texSource;

                            Json::Value sections(Json::arrayValue);
                            Json::Reader rd;
                            for (auto& row : srows) {
                                Json::Value sec;
                                Json::Value content;
                                sec["sectionType"] = row["section_type"].as<std::string>();
                                sec["isVisible"]   = row["is_visible"].as<bool>();
                                rd.parse(row["content"].as<std::string>(), content);
                                sec["content"] = content;
                                sections.append(sec);
                            }
                            resume.sections = sections;

                            // Generate file bytes
                            std::vector<uint8_t> bytes;
                            std::string mimeType, ext;

                            if (format == "docx") {
                                DOCXExporter exp;
                                bytes    = exp.generate(resume);
                                mimeType = exp.mimeType();
                                ext      = exp.fileExtension();
                            } else if (format == "tex") {
                                TeXExporter exp;
                                bytes    = exp.generate(resume);
                                mimeType = exp.mimeType();
                                ext      = exp.fileExtension();
                            } else {  // pdf
                                TeXExporter exp;
                                auto texBytes = exp.generate(resume);
                                std::string texContent(texBytes.begin(), texBytes.end());
                                auto ts = std::to_string(std::chrono::system_clock::now()
                                    .time_since_epoch().count());
                                std::string workDir = storagePath() + "/tmp/" + ts;
                                bytes    = TeXExporter::compileToPDF(texContent, workDir);
                                mimeType = "application/pdf";
                                ext      = ".pdf";
                                // Clean up tex temp dir
                                fs::remove_all(workDir);
                            }

                            if (bytes.empty()) {
                                Json::Value err; err["error"] = "Export generation failed";
                                auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                                resp->setStatusCode(drogon::k500InternalServerError);
                                cb(resp); return;
                            }

                            // Save to disk
                            std::string filename = "resume_" + std::to_string(resumeId) + "_"
                                + std::to_string(std::chrono::system_clock::now()
                                    .time_since_epoch().count()) + ext;
                            std::string filepath = storagePath() + "/" + filename;
                            fs::create_directories(storagePath());

                            std::ofstream outFile(filepath, std::ios::binary);
                            outFile.write(reinterpret_cast<const char*>(bytes.data()), bytes.size());
                            outFile.close();

                            // Record in DB
                            db->execSqlAsync(
                                "INSERT INTO exports (resume_id, format, file_path, file_size, expires_at) "
                                "VALUES (?,?,?,?,DATE_ADD(NOW(), INTERVAL 7 DAY))",
                                [cb, bytes, mimeType, filename](const drogon::orm::Result& er) {
                                    Json::Value res;
                                    res["exportId"]  = static_cast<Json::UInt64>(er.insertId());
                                    res["downloadUrl"] = "/api/export/" + std::to_string(er.insertId()) + "/download";
                                    res["size"]      = static_cast<Json::UInt64>(bytes.size());
                                    cb(drogon::HttpResponse::newHttpJsonResponse(res));
                                },
                                [cb](const drogon::orm::DrogonDbException&) {
                                    Json::Value err; err["error"] = "Failed to record export";
                                    auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                                    resp->setStatusCode(drogon::k500InternalServerError);
                                    cb(resp);
                                },
                                resumeId, format, filepath,
                                static_cast<uint32_t>(bytes.size())
                            );
                        },
                        [cb](const drogon::orm::DrogonDbException&) {
                            Json::Value err; err["error"] = "DB error";
                            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                            resp->setStatusCode(drogon::k500InternalServerError);
                            cb(resp);
                        },
                        userId
                    );
                },
                [cb](const drogon::orm::DrogonDbException&) {
                    Json::Value err; err["error"] = "DB error";
                    auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                    resp->setStatusCode(drogon::k500InternalServerError);
                    cb(resp);
                },
                resumeId
            );
        },
        [cb](const drogon::orm::DrogonDbException&) {
            Json::Value err; err["error"] = "DB error";
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k500InternalServerError);
            cb(resp);
        },
        resumeId, userId
    );
}

void ExportController::exportPDF (const drogon::HttpRequestPtr& req,
                                   std::function<void(const drogon::HttpResponsePtr&)>&& cb,
                                   uint64_t id) { doExport(req, std::move(cb), id, "pdf");  }
void ExportController::exportDOCX(const drogon::HttpRequestPtr& req,
                                   std::function<void(const drogon::HttpResponsePtr&)>&& cb,
                                   uint64_t id) { doExport(req, std::move(cb), id, "docx"); }
void ExportController::exportTEX (const drogon::HttpRequestPtr& req,
                                   std::function<void(const drogon::HttpResponsePtr&)>&& cb,
                                   uint64_t id) { doExport(req, std::move(cb), id, "tex");  }

void ExportController::downloadExport(const drogon::HttpRequestPtr& req,
                                       std::function<void(const drogon::HttpResponsePtr&)>&& cb,
                                       uint64_t exportId) {
    auto db = drogon::app().getDbClient();
    db->execSqlAsync(
        "SELECT e.file_path, e.format, e.expires_at, r.user_id "
        "FROM exports e JOIN resumes r ON e.resume_id = r.id WHERE e.id = ?",
        [cb, req](const drogon::orm::Result& rows) {
            if (rows.empty()) {
                Json::Value err; err["error"] = "Export not found";
                auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                resp->setStatusCode(drogon::k404NotFound);
                cb(resp); return;
            }
            uint64_t userId    = req->attributes()->get<uint64_t>("userId");
            uint64_t ownerUserId = rows[0]["user_id"].as<uint64_t>();
            if (userId != ownerUserId) {
                Json::Value err; err["error"] = "Forbidden";
                auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                resp->setStatusCode(drogon::k403Forbidden);
                cb(resp); return;
            }

            std::string filePath = rows[0]["file_path"].as<std::string>();
            std::string format   = rows[0]["format"].as<std::string>();

            std::ifstream file(filePath, std::ios::binary);
            if (!file) {
                Json::Value err; err["error"] = "File not found on server";
                auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                resp->setStatusCode(drogon::k404NotFound);
                cb(resp); return;
            }

            std::vector<char> bytes(std::istreambuf_iterator<char>(file), {});
            auto resp = drogon::HttpResponse::newHttpResponse();
            resp->setBody(std::string(bytes.begin(), bytes.end()));

            std::string mimeType = "application/octet-stream";
            if (format == "pdf")  mimeType = "application/pdf";
            if (format == "docx") mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            if (format == "tex")  mimeType = "application/x-tex";

            resp->setContentTypeCode(drogon::CT_CUSTOM);
            resp->addHeader("Content-Type", mimeType);
            resp->addHeader("Content-Disposition",
                            "attachment; filename=\"resume." + format + "\"");
            cb(resp);
        },
        [cb](const drogon::orm::DrogonDbException&) {
            Json::Value err; err["error"] = "DB error";
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k500InternalServerError);
            cb(resp);
        },
        exportId
    );
}
