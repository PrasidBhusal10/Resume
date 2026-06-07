#include "TeXExporter.h"
#include <sstream>
#include <algorithm>
#include <filesystem>
#include <fstream>
#include <cstdlib>
#include <array>

// Escape special LaTeX characters
std::string TeXExporter::escapeTeX(const std::string& input) {
    std::string out;
    out.reserve(input.size());
    for (char c : input) {
        switch (c) {
            case '&':  out += "\\&";  break;
            case '%':  out += "\\%";  break;
            case '$':  out += "\\$";  break;
            case '#':  out += "\\#";  break;
            case '_':  out += "\\_";  break;
            case '{':  out += "\\{";  break;
            case '}':  out += "\\}";  break;
            case '~':  out += "\\textasciitilde{}"; break;
            case '^':  out += "\\textasciicircum{}"; break;
            case '\\': out += "\\textbackslash{}"; break;
            default:   out += c;
        }
    }
    return out;
}

std::string TeXExporter::renderSummary(const Json::Value& content) {
    std::ostringstream ss;
    ss << "\\section{Summary}\n";
    ss << escapeTeX(content["text"].asString()) << "\n\n";
    return ss.str();
}

std::string TeXExporter::renderExperience(const Json::Value& content) {
    std::ostringstream ss;
    ss << "\\section{Experience}\n";
    for (auto& item : content["items"]) {
        ss << "\\textbf{" << escapeTeX(item["role"].asString()) << "} "
           << "\\hfill " << escapeTeX(item["start"].asString())
           << " -- " << escapeTeX(item["end"].asString()) << "\\\\\n";
        ss << "\\textit{" << escapeTeX(item["company"].asString()) << "}\\\\\n";
        ss << "\\begin{itemize}[noitemsep,topsep=2pt]\n";
        for (auto& bullet : item["bullets"]) {
            ss << "  \\item " << escapeTeX(bullet.asString()) << "\n";
        }
        ss << "\\end{itemize}\n\\vspace{4pt}\n";
    }
    return ss.str();
}

std::string TeXExporter::renderEducation(const Json::Value& content) {
    std::ostringstream ss;
    ss << "\\section{Education}\n";
    for (auto& item : content["items"]) {
        ss << "\\textbf{" << escapeTeX(item["degree"].asString()) << " in "
           << escapeTeX(item["field"].asString()) << "} "
           << "\\hfill " << escapeTeX(item["start"].asString())
           << " -- " << escapeTeX(item["end"].asString()) << "\\\\\n";
        ss << escapeTeX(item["institution"].asString());
        if (!item["gpa"].asString().empty()) {
            ss << " $\\cdot$ GPA: " << escapeTeX(item["gpa"].asString());
        }
        ss << "\\\\\n\\vspace{4pt}\n";
    }
    return ss.str();
}

std::string TeXExporter::renderSkills(const Json::Value& content) {
    std::ostringstream ss;
    ss << "\\section{Skills}\n";
    for (auto& cat : content["categories"]) {
        ss << "\\textbf{" << escapeTeX(cat["name"].asString()) << ":} ";
        bool first = true;
        for (auto& skill : cat["items"]) {
            if (!first) ss << ", ";
            ss << escapeTeX(skill.asString());
            first = false;
        }
        ss << "\\\\\n";
    }
    return ss.str();
}

std::string TeXExporter::renderProjects(const Json::Value& content) {
    std::ostringstream ss;
    ss << "\\section{Projects}\n";
    for (auto& item : content["items"]) {
        ss << "\\textbf{" << escapeTeX(item["name"].asString()) << "}";
        if (!item["url"].asString().empty()) {
            ss << " \\href{" << item["url"].asString()
               << "}{\\small\\faExternalLink}";
        }
        ss << "\\\\\n";
        ss << "\\begin{itemize}[noitemsep,topsep=2pt]\n";
        for (auto& bullet : item["bullets"]) {
            ss << "  \\item " << escapeTeX(bullet.asString()) << "\n";
        }
        ss << "\\end{itemize}\n\\vspace{4pt}\n";
    }
    return ss.str();
}

std::string TeXExporter::renderCertifications(const Json::Value& content) {
    std::ostringstream ss;
    ss << "\\section{Certifications}\n";
    ss << "\\begin{itemize}[noitemsep]\n";
    for (auto& item : content["items"]) {
        ss << "  \\item \\textbf{" << escapeTeX(item["name"].asString()) << "} "
           << "--- " << escapeTeX(item["issuer"].asString())
           << " (" << escapeTeX(item["date"].asString()) << ")\n";
    }
    ss << "\\end{itemize}\n";
    return ss.str();
}

std::string TeXExporter::renderSections(const Json::Value& sections) {
    std::ostringstream ss;
    for (const auto& sec : sections) {
        if (!sec["isVisible"].asBool()) continue;
        std::string stype = sec["sectionType"].asString();
        const auto& content = sec["content"];
        if      (stype == "summary")        ss << renderSummary(content);
        else if (stype == "experience")     ss << renderExperience(content);
        else if (stype == "education")      ss << renderEducation(content);
        else if (stype == "skills")         ss << renderSkills(content);
        else if (stype == "projects")       ss << renderProjects(content);
        else if (stype == "certifications") ss << renderCertifications(content);
    }
    return ss.str();
}

std::vector<uint8_t> TeXExporter::generate(const ResumeData& resume) {
    std::string tex = resume.texSource;

    // Substitute placeholders
    auto replace = [&](const std::string& placeholder, const std::string& value) {
        std::string escaped = "{{" + placeholder + "}}";
        size_t pos;
        while ((pos = tex.find(escaped)) != std::string::npos)
            tex.replace(pos, escaped.size(), escapeTeX(value));
    };

    replace("NAME",     resume.name);
    replace("EMAIL",    resume.email);
    replace("PHONE",    resume.phone);
    replace("LOCATION", resume.location);
    replace("TITLE",    resume.title);

    // Replace {{SECTIONS}} with rendered LaTeX
    auto sectionsTeX = renderSections(resume.sections);
    size_t pos;
    while ((pos = tex.find("{{SECTIONS}}")) != std::string::npos)
        tex.replace(pos, 12, sectionsTeX);

    return std::vector<uint8_t>(tex.begin(), tex.end());
}

std::vector<uint8_t> TeXExporter::compileToPDF(const std::string& texContent,
                                                 const std::string& workDir) {
    namespace fs = std::filesystem;

    fs::create_directories(workDir);
    std::string texPath = workDir + "/resume.tex";
    std::string pdfPath = workDir + "/resume.pdf";

    std::ofstream f(texPath);
    f << texContent;
    f.close();

    std::string cmd = "pdflatex -interaction=nonstopmode -output-directory="
                    + workDir + " " + texPath + " > /dev/null 2>&1";
    std::system(cmd.c_str());

    std::ifstream pdf(pdfPath, std::ios::binary);
    if (!pdf) return {};
    return std::vector<uint8_t>(std::istreambuf_iterator<char>(pdf), {});
}
