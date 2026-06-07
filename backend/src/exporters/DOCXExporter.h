#pragma once
#include "IDocumentExporter.h"

// Generates a valid .docx file by constructing the required Open XML parts
// and zipping them (DOCX = ZIP with XML). No external DOCX library needed.
class DOCXExporter : public IDocumentExporter {
public:
    std::vector<uint8_t> generate(const ResumeData& resume) override;
    std::string          mimeType()      const override {
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    }
    std::string          fileExtension() const override { return ".docx"; }

private:
    static std::string buildDocumentXml(const ResumeData& resume);
    static std::string xmlEscape(const std::string& input);
    static std::string buildParagraph(const std::string& text, bool bold = false,
                                       int ptSize = 24, const std::string& color = "");
    static std::string buildBullet(const std::string& text);
    static std::vector<uint8_t> zipFiles(
        const std::vector<std::pair<std::string, std::string>>& files);
};
