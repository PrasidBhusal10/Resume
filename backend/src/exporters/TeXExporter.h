#pragma once
#include "IDocumentExporter.h"

// Renders a LaTeX (.tex) file by substituting template placeholders
// with actual resume data, then optionally compiles to PDF via pdflatex.
class TeXExporter : public IDocumentExporter {
public:
    std::vector<uint8_t> generate(const ResumeData& resume) override;
    std::string          mimeType()      const override { return "application/x-tex"; }
    std::string          fileExtension() const override { return ".tex"; }

    // Compile .tex → PDF using pdflatex (must be installed)
    static std::vector<uint8_t> compileToPDF(const std::string& texContent,
                                              const std::string& workDir);

private:
    static std::string renderSections(const Json::Value& sections);
    static std::string renderExperience(const Json::Value& content);
    static std::string renderEducation(const Json::Value& content);
    static std::string renderSkills(const Json::Value& content);
    static std::string renderProjects(const Json::Value& content);
    static std::string renderSummary(const Json::Value& content);
    static std::string renderCertifications(const Json::Value& content);
    static std::string escapeTeX(const std::string& input);
};
