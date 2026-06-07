#include "DOCXExporter.h"
#include <zlib.h>
#include <sstream>
#include <cstring>
#include <ctime>

std::string DOCXExporter::xmlEscape(const std::string& input) {
    std::string out;
    for (char c : input) {
        switch (c) {
            case '<':  out += "&lt;";   break;
            case '>':  out += "&gt;";   break;
            case '&':  out += "&amp;";  break;
            case '"':  out += "&quot;"; break;
            case '\'': out += "&apos;"; break;
            default:   out += c;
        }
    }
    return out;
}

std::string DOCXExporter::buildParagraph(const std::string& text, bool bold,
                                          int ptSize, const std::string& color) {
    std::ostringstream ss;
    ss << "<w:p><w:pPr><w:spacing w:after=\"80\"/></w:pPr><w:r><w:rPr>";
    if (bold)         ss << "<w:b/>";
    if (ptSize > 0)   ss << "<w:sz w:val=\"" << ptSize * 2 << "\"/>";
    if (!color.empty()) ss << "<w:color w:val=\"" << color << "\"/>";
    ss << "</w:rPr><w:t xml:space=\"preserve\">"
       << xmlEscape(text) << "</w:t></w:r></w:p>\n";
    return ss.str();
}

std::string DOCXExporter::buildBullet(const std::string& text) {
    return "<w:p><w:pPr><w:numPr><w:ilvl w:val=\"0\"/><w:numId w:val=\"1\"/>"
           "</w:numPr></w:pPr><w:r><w:t xml:space=\"preserve\">"
           + xmlEscape(text) + "</w:t></w:r></w:p>\n";
}

std::string DOCXExporter::buildDocumentXml(const ResumeData& resume) {
    std::ostringstream doc;
    doc << R"(<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
<w:sectPr><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr>
)";

    // Header
    doc << buildParagraph(resume.name, true, 28, "1D3461");
    doc << buildParagraph(resume.email + "  |  " + resume.phone + "  |  " + resume.location,
                          false, 20, "555555");
    doc << "<w:p><w:pPr><w:pBdr><w:bottom w:val=\"single\" w:sz=\"6\" w:space=\"1\"/>"
           "</w:pBdr></w:pPr></w:p>\n";

    // Sections
    for (const auto& sec : resume.sections) {
        if (!sec["isVisible"].asBool()) continue;
        std::string stype = sec["sectionType"].asString();
        const auto& content = sec["content"];

        // Section heading
        std::string heading;
        if      (stype == "summary")        heading = "Summary";
        else if (stype == "experience")     heading = "Experience";
        else if (stype == "education")      heading = "Education";
        else if (stype == "skills")         heading = "Skills";
        else if (stype == "projects")       heading = "Projects";
        else if (stype == "certifications") heading = "Certifications";
        else if (stype == "languages")      heading = "Languages";
        else                                heading = stype;

        doc << buildParagraph(heading, true, 22, "2563EB");

        if (stype == "summary") {
            doc << buildParagraph(content["text"].asString());
        }
        else if (stype == "experience") {
            for (const auto& item : content["items"]) {
                doc << buildParagraph(
                    item["role"].asString() + " @ " + item["company"].asString()
                    + "  (" + item["start"].asString() + " – " + item["end"].asString() + ")",
                    true, 22);
                for (const auto& bullet : item["bullets"])
                    doc << buildBullet(bullet.asString());
            }
        }
        else if (stype == "education") {
            for (const auto& item : content["items"]) {
                doc << buildParagraph(
                    item["degree"].asString() + " in " + item["field"].asString()
                    + " — " + item["institution"].asString(),
                    true, 22);
                std::string sub = item["start"].asString() + " – " + item["end"].asString();
                if (!item["gpa"].asString().empty()) sub += "  GPA: " + item["gpa"].asString();
                doc << buildParagraph(sub, false, 20);
            }
        }
        else if (stype == "skills") {
            for (const auto& cat : content["categories"]) {
                std::string line = cat["name"].asString() + ": ";
                bool first = true;
                for (const auto& skill : cat["items"]) {
                    if (!first) line += ", ";
                    line += skill.asString();
                    first = false;
                }
                doc << buildParagraph(line, false, 22);
            }
        }
        else if (stype == "projects") {
            for (const auto& item : content["items"]) {
                doc << buildParagraph(item["name"].asString(), true, 22);
                doc << buildParagraph(item["description"].asString(), false, 20);
                for (const auto& bullet : item["bullets"])
                    doc << buildBullet(bullet.asString());
            }
        }
        else if (stype == "certifications") {
            for (const auto& item : content["items"])
                doc << buildBullet(item["name"].asString() + " — "
                                   + item["issuer"].asString()
                                   + " (" + item["date"].asString() + ")");
        }
    }

    doc << "</w:body></w:document>";
    return doc.str();
}

// Minimal ZIP implementation (no external lib) using zlib deflate
std::vector<uint8_t> DOCXExporter::zipFiles(
    const std::vector<std::pair<std::string, std::string>>& files) {

    std::vector<uint8_t> zip;
    std::vector<std::tuple<std::string, uint32_t, uint32_t, uint32_t, uint32_t>> cdEntries;
    // <name, crc32, compressedSize, uncompressedSize, offset>

    auto writeLE16 = [&](uint16_t v) {
        zip.push_back(v & 0xFF);
        zip.push_back((v >> 8) & 0xFF);
    };
    auto writeLE32 = [&](uint32_t v) {
        zip.push_back(v & 0xFF);
        zip.push_back((v >> 8) & 0xFF);
        zip.push_back((v >> 16) & 0xFF);
        zip.push_back((v >> 24) & 0xFF);
    };

    for (auto& [name, content] : files) {
        uint32_t offset = static_cast<uint32_t>(zip.size());
        uint32_t crc    = crc32(0, reinterpret_cast<const uint8_t*>(content.data()), content.size());

        // Compress with deflate
        uLongf compLen = compressBound(content.size());
        std::vector<uint8_t> compressed(compLen);
        compress2(compressed.data(), &compLen,
                  reinterpret_cast<const uint8_t*>(content.data()), content.size(), Z_DEFAULT_COMPRESSION);
        // Strip the 2-byte zlib header and 4-byte checksum for raw deflate
        std::vector<uint8_t> deflated(compressed.begin() + 2, compressed.begin() + compLen - 4);

        // Local file header
        writeLE32(0x04034b50);  // signature
        writeLE16(20);          // version needed
        writeLE16(0);           // flags
        writeLE16(8);           // compression: deflate
        writeLE16(0); writeLE16(0); // mod time/date
        writeLE32(crc);
        writeLE32(static_cast<uint32_t>(deflated.size()));
        writeLE32(static_cast<uint32_t>(content.size()));
        writeLE16(static_cast<uint16_t>(name.size()));
        writeLE16(0);           // extra field length
        zip.insert(zip.end(), name.begin(), name.end());
        zip.insert(zip.end(), deflated.begin(), deflated.end());

        cdEntries.emplace_back(name, crc, static_cast<uint32_t>(deflated.size()),
                               static_cast<uint32_t>(content.size()), offset);
    }

    uint32_t cdStart = static_cast<uint32_t>(zip.size());
    for (auto& [name, crc, compSz, uncompSz, offset] : cdEntries) {
        writeLE32(0x02014b50);  // CD signature
        writeLE16(20); writeLE16(20);
        writeLE16(0); writeLE16(8);
        writeLE16(0); writeLE16(0);
        writeLE32(crc);
        writeLE32(compSz); writeLE32(uncompSz);
        writeLE16(static_cast<uint16_t>(name.size()));
        writeLE16(0); writeLE16(0); writeLE16(0); writeLE16(0);
        writeLE32(0); writeLE32(offset);
        zip.insert(zip.end(), name.begin(), name.end());
    }

    uint32_t cdEnd = static_cast<uint32_t>(zip.size());
    writeLE32(0x06054b50);  // EOCD signature
    writeLE16(0); writeLE16(0);
    writeLE16(static_cast<uint16_t>(cdEntries.size()));
    writeLE16(static_cast<uint16_t>(cdEntries.size()));
    writeLE32(cdEnd - cdStart);
    writeLE32(cdStart);
    writeLE16(0);  // comment length

    return zip;
}

std::vector<uint8_t> DOCXExporter::generate(const ResumeData& resume) {
    std::string docXml = buildDocumentXml(resume);

    std::vector<std::pair<std::string, std::string>> files = {
        {"[Content_Types].xml", R"(<?xml version="1.0"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml"  ContentType="application/xml"/>
  <Override PartName="/word/document.xml"
    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>)"},
        {"_rels/.rels", R"(<?xml version="1.0"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
    Target="word/document.xml"/>
</Relationships>)"},
        {"word/_rels/document.xml.rels", R"(<?xml version="1.0"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>)"},
        {"word/document.xml", docXml},
    };

    return zipFiles(files);
}
