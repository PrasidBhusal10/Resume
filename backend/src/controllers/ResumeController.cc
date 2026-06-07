#include "ResumeController.h"
#include <drogon/orm/DbClient.h>

static void sendError(std::function<void(const drogon::HttpResponsePtr&)>& cb,
                      const std::string& msg, drogon::HttpStatusCode code) {
    Json::Value err; err["error"] = msg;
    auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
    resp->setStatusCode(code);
    cb(resp);
}

void ResumeController::createResume(const drogon::HttpRequestPtr& req,
                                     std::function<void(const drogon::HttpResponsePtr&)>&& cb,
                                     uint64_t) {
    uint64_t userId = req->attributes()->get<uint64_t>("userId");
    auto json = req->getJsonObject();
    if (!json || !(*json)["templateId"]) {
        sendError(cb, "templateId is required", drogon::k400BadRequest); return;
    }

    int templateId   = (*json)["templateId"].asInt();
    std::string title = (*json)["title"].asString();
    if (title.empty()) title = "My Resume";

    auto db = drogon::app().getDbClient();
    db->execSqlAsync(
        "INSERT INTO resumes (user_id, template_id, title) VALUES (?,?,?)",
        [cb, db, userId, templateId](const drogon::orm::Result& r) {
            uint64_t newId = r.insertId();
            // Seed with empty sections
            std::vector<std::pair<std::string,std::string>> defaultSections = {
                {"summary",    R"({"text":""})"},
                {"experience", R"({"items":[]})"},
                {"education",  R"({"items":[]})"},
                {"skills",     R"({"categories":[]})"},
                {"projects",   R"({"items":[]})"},
            };
            int order = 0;
            for (auto& [stype, scontent] : defaultSections) {
                db->execSqlAsync(
                    "INSERT INTO resume_sections (resume_id, section_type, section_order, content) VALUES (?,?,?,?)",
                    [](const drogon::orm::Result&){},
                    [](const drogon::orm::DrogonDbException&){},
                    newId, stype, order++, scontent
                );
            }
            Json::Value res;
            res["id"]      = static_cast<Json::UInt64>(newId);
            res["message"] = "Resume created";
            cb(drogon::HttpResponse::newHttpJsonResponse(res));
        },
        [cb](const drogon::orm::DrogonDbException& e) {
            sendError(const_cast<std::function<void(const drogon::HttpResponsePtr&)>&>(cb),
                      "Failed to create resume", drogon::k500InternalServerError);
        },
        userId, templateId, title
    );
}

void ResumeController::listResumes(const drogon::HttpRequestPtr& req,
                                    std::function<void(const drogon::HttpResponsePtr&)>&& cb) {
    uint64_t userId = req->attributes()->get<uint64_t>("userId");
    auto db = drogon::app().getDbClient();

    db->execSqlAsync(
        "SELECT r.id, r.title, r.version, r.created_at, r.updated_at, "
        "t.name as template_name, t.preview_url "
        "FROM resumes r JOIN templates t ON r.template_id = t.id "
        "WHERE r.user_id = ? ORDER BY r.updated_at DESC",
        [cb](const drogon::orm::Result& rows) {
            Json::Value list(Json::arrayValue);
            for (auto& row : rows) {
                Json::Value item;
                item["id"]           = static_cast<Json::UInt64>(row["id"].as<uint64_t>());
                item["title"]        = row["title"].as<std::string>();
                item["version"]      = row["version"].as<int>();
                item["templateName"] = row["template_name"].as<std::string>();
                item["previewUrl"]   = row["preview_url"].isNull() ? "" : row["preview_url"].as<std::string>();
                item["createdAt"]    = row["created_at"].as<std::string>();
                item["updatedAt"]    = row["updated_at"].as<std::string>();
                list.append(item);
            }
            cb(drogon::HttpResponse::newHttpJsonResponse(list));
        },
        [cb](const drogon::orm::DrogonDbException&) {
            sendError(const_cast<std::function<void(const drogon::HttpResponsePtr&)>&>(cb),
                      "Database error", drogon::k500InternalServerError);
        },
        userId
    );
}

void ResumeController::getResume(const drogon::HttpRequestPtr& req,
                                  std::function<void(const drogon::HttpResponsePtr&)>&& cb,
                                  uint64_t id) {
    uint64_t userId = req->attributes()->get<uint64_t>("userId");
    auto db = drogon::app().getDbClient();

    db->execSqlAsync(
        "SELECT r.id, r.title, r.version, r.template_id, r.created_at, r.updated_at, "
        "t.name as template_name, t.tex_source, t.category "
        "FROM resumes r JOIN templates t ON r.template_id = t.id "
        "WHERE r.id = ? AND r.user_id = ?",
        [cb, db, id](const drogon::orm::Result& rows) {
            if (rows.empty()) {
                Json::Value err; err["error"] = "Resume not found";
                auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                resp->setStatusCode(drogon::k404NotFound);
                cb(resp); return;
            }
            auto row = rows[0];
            Json::Value resume;
            resume["id"]           = static_cast<Json::UInt64>(row["id"].as<uint64_t>());
            resume["title"]        = row["title"].as<std::string>();
            resume["version"]      = row["version"].as<int>();
            resume["templateId"]   = row["template_id"].as<int>();
            resume["templateName"] = row["template_name"].as<std::string>();
            resume["category"]     = row["category"].as<std::string>();
            resume["createdAt"]    = row["created_at"].as<std::string>();
            resume["updatedAt"]    = row["updated_at"].as<std::string>();

            // Fetch sections
            db->execSqlAsync(
                "SELECT id, section_type, section_order, content, is_visible "
                "FROM resume_sections WHERE resume_id = ? ORDER BY section_order",
                [cb, resume = std::move(resume)](const drogon::orm::Result& srows) mutable {
                    Json::Value sections(Json::arrayValue);
                    for (auto& srow : srows) {
                        Json::Value sec;
                        sec["id"]          = static_cast<Json::UInt64>(srow["id"].as<uint64_t>());
                        sec["sectionType"] = srow["section_type"].as<std::string>();
                        sec["order"]       = srow["section_order"].as<int>();
                        sec["isVisible"]   = srow["is_visible"].as<bool>();
                        // Parse JSON content
                        Json::Reader rd;
                        Json::Value  content;
                        rd.parse(srow["content"].as<std::string>(), content);
                        sec["content"] = content;
                        sections.append(sec);
                    }
                    resume["sections"] = sections;
                    cb(drogon::HttpResponse::newHttpJsonResponse(resume));
                },
                [cb](const drogon::orm::DrogonDbException&) {
                    sendError(const_cast<std::function<void(const drogon::HttpResponsePtr&)>&>(cb),
                              "Database error", drogon::k500InternalServerError);
                },
                id
            );
        },
        [cb](const drogon::orm::DrogonDbException&) {
            sendError(const_cast<std::function<void(const drogon::HttpResponsePtr&)>&>(cb),
                      "Database error", drogon::k500InternalServerError);
        },
        id, userId
    );
}

void ResumeController::updateResume(const drogon::HttpRequestPtr& req,
                                     std::function<void(const drogon::HttpResponsePtr&)>&& cb,
                                     uint64_t id) {
    uint64_t userId = req->attributes()->get<uint64_t>("userId");
    auto json = req->getJsonObject();
    auto db = drogon::app().getDbClient();

    std::string title = (*json)["title"].asString();
    db->execSqlAsync(
        "UPDATE resumes SET title=?, version=version+1 WHERE id=? AND user_id=?",
        [cb](const drogon::orm::Result& r) {
            Json::Value res; res["message"] = "Updated";
            cb(drogon::HttpResponse::newHttpJsonResponse(res));
        },
        [cb](const drogon::orm::DrogonDbException&) {
            sendError(const_cast<std::function<void(const drogon::HttpResponsePtr&)>&>(cb),
                      "Update failed", drogon::k500InternalServerError);
        },
        title, id, userId
    );
}

void ResumeController::deleteResume(const drogon::HttpRequestPtr& req,
                                     std::function<void(const drogon::HttpResponsePtr&)>&& cb,
                                     uint64_t id) {
    uint64_t userId = req->attributes()->get<uint64_t>("userId");
    auto db = drogon::app().getDbClient();

    db->execSqlAsync(
        "DELETE FROM resumes WHERE id=? AND user_id=?",
        [cb](const drogon::orm::Result&) {
            Json::Value res; res["message"] = "Deleted";
            cb(drogon::HttpResponse::newHttpJsonResponse(res));
        },
        [cb](const drogon::orm::DrogonDbException&) {
            sendError(const_cast<std::function<void(const drogon::HttpResponsePtr&)>&>(cb),
                      "Delete failed", drogon::k500InternalServerError);
        },
        id, userId
    );
}

void ResumeController::updateSection(const drogon::HttpRequestPtr& req,
                                      std::function<void(const drogon::HttpResponsePtr&)>&& cb,
                                      uint64_t id, std::string type) {
    uint64_t userId = req->attributes()->get<uint64_t>("userId");
    auto json = req->getJsonObject();
    if (!json || !(*json)["content"]) {
        sendError(cb, "content is required", drogon::k400BadRequest); return;
    }

    Json::FastWriter fw;
    std::string contentStr = fw.write((*json)["content"]);
    bool isVisible = (*json)["isVisible"].asBool();
    auto db = drogon::app().getDbClient();

    // Verify resume ownership
    db->execSqlAsync(
        "SELECT id FROM resumes WHERE id=? AND user_id=?",
        [cb, db, id, type, contentStr, isVisible](const drogon::orm::Result& r) {
            if (r.empty()) {
                Json::Value err; err["error"] = "Resume not found";
                auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                resp->setStatusCode(drogon::k404NotFound);
                cb(resp); return;
            }
            db->execSqlAsync(
                "UPDATE resume_sections SET content=?, is_visible=? "
                "WHERE resume_id=? AND section_type=?",
                [cb](const drogon::orm::Result&) {
                    Json::Value res; res["message"] = "Section updated";
                    cb(drogon::HttpResponse::newHttpJsonResponse(res));
                },
                [cb](const drogon::orm::DrogonDbException&) {
                    sendError(const_cast<std::function<void(const drogon::HttpResponsePtr&)>&>(cb),
                              "Section update failed", drogon::k500InternalServerError);
                },
                contentStr, isVisible, id, type
            );
        },
        [cb](const drogon::orm::DrogonDbException&) {
            sendError(const_cast<std::function<void(const drogon::HttpResponsePtr&)>&>(cb),
                      "Database error", drogon::k500InternalServerError);
        },
        id, userId
    );
}

void ResumeController::reorderSections(const drogon::HttpRequestPtr& req,
                                        std::function<void(const drogon::HttpResponsePtr&)>&& cb,
                                        uint64_t id) {
    auto json = req->getJsonObject();
    if (!json || !(*json)["order"].isArray()) {
        sendError(cb, "order array is required", drogon::k400BadRequest); return;
    }
    auto db = drogon::app().getDbClient();
    auto& orderArr = (*json)["order"];
    for (int i = 0; i < static_cast<int>(orderArr.size()); i++) {
        db->execSqlAsync(
            "UPDATE resume_sections SET section_order=? WHERE id=? AND resume_id=?",
            [](const drogon::orm::Result&){},
            [](const drogon::orm::DrogonDbException&){},
            i, orderArr[i].asUInt64(), id
        );
    }
    Json::Value res; res["message"] = "Sections reordered";
    cb(drogon::HttpResponse::newHttpJsonResponse(res));
}
