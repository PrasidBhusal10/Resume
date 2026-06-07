#include "JDController.h"
#include "utils/HttpClient.h"
#include <drogon/orm/DbClient.h>
#include <cstdlib>

static std::string aiServiceUrl() {
    const char* u = std::getenv("AI_SERVICE_URL");
    return u ? u : "http://localhost:8001";
}

void JDController::analyzeJD(const drogon::HttpRequestPtr& req,
                               std::function<void(const drogon::HttpResponsePtr&)>&& cb) {
    uint64_t userId   = req->attributes()->get<uint64_t>("userId");
    auto json = req->getJsonObject();
    if (!json || !(*json)["rawText"] || !(*json)["resumeId"]) {
        Json::Value err; err["error"] = "rawText and resumeId are required";
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        cb(resp); return;
    }

    std::string rawText  = (*json)["rawText"].asString();
    uint64_t    resumeId = (*json)["resumeId"].asUInt64();
    std::string company  = (*json).get("companyName", "").asString();
    std::string jobTitle = (*json).get("jobTitle", "").asString();

    // Call AI service to extract structured JD data
    Json::Value payload;
    payload["raw_text"]    = rawText;
    payload["company"]     = company;
    payload["job_title"]   = jobTitle;

    auto aiResp = HttpClient::post(aiServiceUrl() + "/api/extract-jd", payload, 30000);
    if (aiResp.statusCode != 200) {
        Json::Value err; err["error"] = "AI service failed to extract JD";
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k502BadGateway);
        cb(resp); return;
    }

    Json::FastWriter fw;
    std::string extractedStr = fw.write(aiResp.body);

    auto db = drogon::app().getDbClient();
    db->execSqlAsync(
        "INSERT INTO job_descriptions (user_id, resume_id, company_name, job_title, raw_text, extracted_data) "
        "VALUES (?,?,?,?,?,?)",
        [cb, extracted = aiResp.body](const drogon::orm::Result& r) {
            Json::Value res;
            res["jdId"]      = static_cast<Json::UInt64>(r.insertId());
            res["extracted"] = extracted;
            cb(drogon::HttpResponse::newHttpJsonResponse(res));
        },
        [cb](const drogon::orm::DrogonDbException& e) {
            Json::Value err; err["error"] = "Failed to save JD";
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k500InternalServerError);
            cb(resp);
        },
        userId, resumeId, company, jobTitle, rawText, extractedStr
    );
}

void JDController::optimizeResume(const drogon::HttpRequestPtr& req,
                                   std::function<void(const drogon::HttpResponsePtr&)>&& cb,
                                   uint64_t resumeId) {
    uint64_t userId = req->attributes()->get<uint64_t>("userId");
    auto json = req->getJsonObject();
    if (!json || !(*json)["jdId"] || !(*json)["sections"].isArray()) {
        Json::Value err; err["error"] = "jdId and sections[] are required";
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        cb(resp); return;
    }

    uint64_t jdId = (*json)["jdId"].asUInt64();
    auto& sections = (*json)["sections"];
    auto db = drogon::app().getDbClient();

    // Load resume sections + JD in parallel (sequential for simplicity here)
    db->execSqlAsync(
        "SELECT rs.section_type, rs.content "
        "FROM resume_sections rs "
        "JOIN resumes r ON rs.resume_id = r.id "
        "WHERE rs.resume_id = ? AND r.user_id = ? AND rs.is_visible = TRUE",
        [cb, db, resumeId, jdId, sections](const drogon::orm::Result& sectionRows) {
            db->execSqlAsync(
                "SELECT raw_text, extracted_data FROM job_descriptions WHERE id = ?",
                [cb, db, resumeId, jdId, sections, sectionRows]
                (const drogon::orm::Result& jdRows) {
                    if (jdRows.empty()) {
                        Json::Value err; err["error"] = "JD not found";
                        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                        resp->setStatusCode(drogon::k404NotFound);
                        cb(resp); return;
                    }

                    Json::Reader rd;
                    Json::Value  extractedData;
                    rd.parse(jdRows[0]["extracted_data"].as<std::string>(), extractedData);

                    // Build request to AI service
                    Json::Value aiPayload;
                    aiPayload["jd_raw_text"]    = jdRows[0]["raw_text"].as<std::string>();
                    aiPayload["jd_extracted"]   = extractedData;
                    aiPayload["sections_to_optimize"] = sections;

                    Json::Value resumeSections(Json::arrayValue);
                    for (auto& row : sectionRows) {
                        Json::Value sec;
                        Json::Value content;
                        sec["type"] = row["section_type"].as<std::string>();
                        rd.parse(row["content"].as<std::string>(), content);
                        sec["content"] = content;
                        resumeSections.append(sec);
                    }
                    aiPayload["current_sections"] = resumeSections;

                    auto aiResp = HttpClient::post(
                        std::string(std::getenv("AI_SERVICE_URL") ? std::getenv("AI_SERVICE_URL") : "http://localhost:8001")
                        + "/api/optimize", aiPayload, 60000);

                    if (aiResp.statusCode != 200) {
                        Json::Value err; err["error"] = "AI optimization failed";
                        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                        resp->setStatusCode(drogon::k502BadGateway);
                        cb(resp); return;
                    }

                    // Persist optimization sessions
                    Json::FastWriter fw;
                    Json::Value sessionIds(Json::arrayValue);
                    auto& suggestions = aiResp.body["suggestions"];

                    for (auto& sug : suggestions) {
                        std::string stype = sug["section_type"].asString();
                        // find original content
                        Json::Value orig;
                        for (auto& row : sectionRows) {
                            if (row["section_type"].as<std::string>() == stype) {
                                Json::Reader r2;
                                r2.parse(row["content"].as<std::string>(), orig);
                                break;
                            }
                        }
                        db->execSqlAsync(
                            "INSERT INTO optimization_sessions "
                            "(jd_id, resume_id, section_type, original_content, suggested_content, "
                            " diff_summary, ats_score_before, ats_score_after) "
                            "VALUES (?,?,?,?,?,?,?,?)",
                            [](const drogon::orm::Result&){},
                            [](const drogon::orm::DrogonDbException&){},
                            jdId, resumeId, stype,
                            fw.write(orig),
                            fw.write(sug["suggested"]),
                            sug["diff_summary"].asString(),
                            sug["ats_before"].asInt(),
                            sug["ats_after"].asInt()
                        );
                    }

                    cb(drogon::HttpResponse::newHttpJsonResponse(aiResp.body));
                },
                [cb](const drogon::orm::DrogonDbException&) {
                    Json::Value err; err["error"] = "Database error";
                    auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                    resp->setStatusCode(drogon::k500InternalServerError);
                    cb(resp);
                },
                jdId
            );
        },
        [cb](const drogon::orm::DrogonDbException&) {
            Json::Value err; err["error"] = "Database error";
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k500InternalServerError);
            cb(resp);
        },
        resumeId, userId
    );
}

void JDController::acceptSession(const drogon::HttpRequestPtr& req,
                                  std::function<void(const drogon::HttpResponsePtr&)>&& cb,
                                  uint64_t sessionId) {
    auto db = drogon::app().getDbClient();
    // Fetch session details, then apply suggested_content to resume_sections
    db->execSqlAsync(
        "SELECT resume_id, section_type, suggested_content FROM optimization_sessions WHERE id = ?",
        [cb, db, sessionId](const drogon::orm::Result& rows) {
            if (rows.empty()) {
                Json::Value err; err["error"] = "Session not found";
                auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                resp->setStatusCode(drogon::k404NotFound);
                cb(resp); return;
            }
            auto& row = rows[0];
            uint64_t resumeId = row["resume_id"].as<uint64_t>();
            std::string stype = row["section_type"].as<std::string>();
            std::string suggestedContent = row["suggested_content"].as<std::string>();

            // Apply suggestion to live resume
            db->execSqlAsync(
                "UPDATE resume_sections SET content=? WHERE resume_id=? AND section_type=?",
                [cb, db, sessionId](const drogon::orm::Result&) {
                    db->execSqlAsync(
                        "UPDATE optimization_sessions SET user_accepted=TRUE, accepted_at=NOW() WHERE id=?",
                        [cb](const drogon::orm::Result&) {
                            Json::Value res; res["message"] = "Changes applied to resume";
                            cb(drogon::HttpResponse::newHttpJsonResponse(res));
                        },
                        [](const drogon::orm::DrogonDbException&){},
                        sessionId
                    );
                },
                [cb](const drogon::orm::DrogonDbException&) {
                    Json::Value err; err["error"] = "Failed to apply changes";
                    auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                    resp->setStatusCode(drogon::k500InternalServerError);
                    cb(resp);
                },
                suggestedContent, resumeId, stype
            );
        },
        [cb](const drogon::orm::DrogonDbException&) {
            Json::Value err; err["error"] = "Database error";
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k500InternalServerError);
            cb(resp);
        },
        sessionId
    );
}

void JDController::rejectSession(const drogon::HttpRequestPtr& req,
                                  std::function<void(const drogon::HttpResponsePtr&)>&& cb,
                                  uint64_t sessionId) {
    auto db = drogon::app().getDbClient();
    db->execSqlAsync(
        "UPDATE optimization_sessions SET user_accepted=FALSE WHERE id=?",
        [cb](const drogon::orm::Result&) {
            Json::Value res; res["message"] = "Suggestion rejected";
            cb(drogon::HttpResponse::newHttpJsonResponse(res));
        },
        [cb](const drogon::orm::DrogonDbException&) {
            Json::Value err; err["error"] = "Database error";
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k500InternalServerError);
            cb(resp);
        },
        sessionId
    );
}
