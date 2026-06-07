#include "TemplateController.h"
#include <drogon/orm/DbClient.h>

void TemplateController::listTemplates(const drogon::HttpRequestPtr& req,
                                        std::function<void(const drogon::HttpResponsePtr&)>&& cb) {
    auto db = drogon::app().getDbClient();
    db->execSqlAsync(
        "SELECT id, name, description, preview_url, category, is_premium, sort_order "
        "FROM templates ORDER BY sort_order",
        [cb](const drogon::orm::Result& rows) {
            Json::Value list(Json::arrayValue);
            for (auto& row : rows) {
                Json::Value t;
                t["id"]          = row["id"].as<int>();
                t["name"]        = row["name"].as<std::string>();
                t["description"] = row["description"].isNull() ? "" : row["description"].as<std::string>();
                t["previewUrl"]  = row["preview_url"].isNull()  ? "" : row["preview_url"].as<std::string>();
                t["category"]    = row["category"].as<std::string>();
                t["isPremium"]   = row["is_premium"].as<bool>();
                list.append(t);
            }
            cb(drogon::HttpResponse::newHttpJsonResponse(list));
        },
        [cb](const drogon::orm::DrogonDbException&) {
            Json::Value err; err["error"] = "Database error";
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k500InternalServerError);
            cb(resp);
        }
    );
}

void TemplateController::getTemplate(const drogon::HttpRequestPtr& req,
                                      std::function<void(const drogon::HttpResponsePtr&)>&& cb,
                                      int id) {
    auto db = drogon::app().getDbClient();
    db->execSqlAsync(
        "SELECT * FROM templates WHERE id = ?",
        [cb](const drogon::orm::Result& rows) {
            if (rows.empty()) {
                Json::Value err; err["error"] = "Template not found";
                auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                resp->setStatusCode(drogon::k404NotFound);
                cb(resp); return;
            }
            auto& row = rows[0];
            Json::Value t;
            t["id"]          = row["id"].as<int>();
            t["name"]        = row["name"].as<std::string>();
            t["description"] = row["description"].isNull() ? "" : row["description"].as<std::string>();
            t["texSource"]   = row["tex_source"].as<std::string>();
            t["category"]    = row["category"].as<std::string>();
            t["isPremium"]   = row["is_premium"].as<bool>();
            cb(drogon::HttpResponse::newHttpJsonResponse(t));
        },
        [cb](const drogon::orm::DrogonDbException&) {
            Json::Value err; err["error"] = "Database error";
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k500InternalServerError);
            cb(resp);
        },
        id
    );
}
