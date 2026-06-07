#pragma once
#include <string>
#include <vector>
#include <json/json.h>

struct ResumeData {
    std::string name;
    std::string email;
    std::string phone;
    std::string location;
    std::string title;
    Json::Value sections;   // array of { sectionType, content }
    std::string texSource;  // template LaTeX source
};

class IDocumentExporter {
public:
    virtual std::vector<uint8_t> generate(const ResumeData& resume) = 0;
    virtual std::string          mimeType() const = 0;
    virtual std::string          fileExtension() const = 0;
    virtual ~IDocumentExporter() = default;
};
