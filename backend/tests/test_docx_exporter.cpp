/**
 * test_docx_exporter.cpp
 *
 * Unit tests for DOCXExporter:
 * - xmlEscape: all 5 XML special characters
 * - buildParagraph: bold, ptSize, color, plain text
 * - buildDocumentXml: name/email header, section rendering, hidden sections
 * - generate: ZIP structure, [Content_Types].xml present, non-empty output
 */

#include <gtest/gtest.h>
#include <json/json.h>
#include <string>
#include <vector>
#include <algorithm>
#include <cstdint>

#include "exporters/DOCXExporter.h"

// ── Expose private methods for testing via subclass ───────────────────────────

class DOCXExporterTestable : public DOCXExporter {
public:
    using DOCXExporter::xmlEscape;
    using DOCXExporter::buildParagraph;
    using DOCXExporter::buildBullet;
    using DOCXExporter::buildDocumentXml;
    using DOCXExporter::zipFiles;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

static ResumeData makeMinimalResume() {
    ResumeData r;
    r.name     = "Jane Doe";
    r.email    = "jane@example.com";
    r.phone    = "+1-555-123-4567";
    r.location = "Austin, TX";
    r.title    = "Data Scientist";
    r.sections = Json::Value(Json::arrayValue);
    return r;
}

static Json::Value makeSummarySection(const std::string& text, bool visible = true) {
    Json::Value s;
    s["sectionType"] = "summary";
    s["isVisible"]   = visible;
    s["content"]["text"] = text;
    return s;
}

static Json::Value makeSkillsSection(bool visible = true) {
    Json::Value cat;
    cat["name"] = "Languages";
    cat["items"].append("Python");
    cat["items"].append("C++");
    Json::Value s;
    s["sectionType"] = "skills";
    s["isVisible"]   = visible;
    s["content"]["categories"].append(cat);
    return s;
}

static Json::Value makeExperienceSection(bool visible = true) {
    Json::Value item;
    item["role"]    = "Engineer";
    item["company"] = "Corp";
    item["start"]   = "2020";
    item["end"]     = "Present";
    item["bullets"].append("Built APIs");
    Json::Value s;
    s["sectionType"] = "experience";
    s["isVisible"]   = visible;
    s["content"]["items"].append(item);
    return s;
}

// ZIP parsing helpers — just check structural markers, not full parse
static bool containsZipSignature(const std::vector<uint8_t>& data) {
    // Local file header signature: PK\x03\x04
    return data.size() > 4 &&
           data[0] == 0x50 && data[1] == 0x4B &&
           data[2] == 0x03 && data[3] == 0x04;
}

static bool containsEOCDSignature(const std::vector<uint8_t>& data) {
    // EOCD signature: PK\x05\x06
    for (size_t i = 0; i + 3 < data.size(); ++i) {
        if (data[i] == 0x50 && data[i+1] == 0x4B &&
            data[i+2] == 0x05 && data[i+3] == 0x06)
            return true;
    }
    return false;
}

// ── xmlEscape ─────────────────────────────────────────────────────────────────

TEST(XmlEscapeTest, LessThan) {
    EXPECT_EQ(DOCXExporterTestable::xmlEscape("a<b"), "a&lt;b");
}

TEST(XmlEscapeTest, GreaterThan) {
    EXPECT_EQ(DOCXExporterTestable::xmlEscape("a>b"), "a&gt;b");
}

TEST(XmlEscapeTest, Ampersand) {
    EXPECT_EQ(DOCXExporterTestable::xmlEscape("a&b"), "a&amp;b");
}

TEST(XmlEscapeTest, DoubleQuote) {
    EXPECT_EQ(DOCXExporterTestable::xmlEscape("a\"b"), "a&quot;b");
}

TEST(XmlEscapeTest, SingleQuote) {
    EXPECT_EQ(DOCXExporterTestable::xmlEscape("a'b"), "a&apos;b");
}

TEST(XmlEscapeTest, PlainTextUnchanged) {
    EXPECT_EQ(DOCXExporterTestable::xmlEscape("Hello World 123"), "Hello World 123");
}

TEST(XmlEscapeTest, EmptyStringReturnsEmpty) {
    EXPECT_EQ(DOCXExporterTestable::xmlEscape(""), "");
}

TEST(XmlEscapeTest, MultipleSpecialChars) {
    std::string result = DOCXExporterTestable::xmlEscape("<a href=\"x&y\">link</a>");
    EXPECT_NE(result.find("&lt;"),  std::string::npos);
    EXPECT_NE(result.find("&gt;"),  std::string::npos);
    EXPECT_NE(result.find("&amp;"), std::string::npos);
    EXPECT_NE(result.find("&quot;"),std::string::npos);
}

// ── buildParagraph ────────────────────────────────────────────────────────────

TEST(BuildParagraphTest, ContainsText) {
    std::string para = DOCXExporterTestable::buildParagraph("Hello World");
    EXPECT_NE(para.find("Hello World"), std::string::npos);
}

TEST(BuildParagraphTest, BoldApplied) {
    std::string para = DOCXExporterTestable::buildParagraph("Bold", true);
    EXPECT_NE(para.find("<w:b/>"), std::string::npos);
}

TEST(BuildParagraphTest, NoBoldWhenFalse) {
    std::string para = DOCXExporterTestable::buildParagraph("Not bold", false);
    EXPECT_EQ(para.find("<w:b/>"), std::string::npos);
}

TEST(BuildParagraphTest, PointSizeEncoded) {
    std::string para = DOCXExporterTestable::buildParagraph("Text", false, 28);
    // ptSize * 2 = 56 for half-points
    EXPECT_NE(para.find("56"), std::string::npos);
}

TEST(BuildParagraphTest, ColorEncoded) {
    std::string para = DOCXExporterTestable::buildParagraph("Text", false, 24, "FF0000");
    EXPECT_NE(para.find("FF0000"), std::string::npos);
}

TEST(BuildParagraphTest, SpecialXmlCharsEscapedInParagraph) {
    std::string para = DOCXExporterTestable::buildParagraph("Tom & Jerry");
    EXPECT_NE(para.find("&amp;"), std::string::npos);
    EXPECT_EQ(para.find(" & "),   std::string::npos);
}

// ── buildBullet ───────────────────────────────────────────────────────────────

TEST(BuildBulletTest, ContainsText) {
    std::string bullet = DOCXExporterTestable::buildBullet("Did X resulting in Y");
    EXPECT_NE(bullet.find("Did X resulting in Y"), std::string::npos);
}

TEST(BuildBulletTest, ContainsNumPrElement) {
    std::string bullet = DOCXExporterTestable::buildBullet("item");
    EXPECT_NE(bullet.find("w:numPr"), std::string::npos);
}

// ── buildDocumentXml ──────────────────────────────────────────────────────────

TEST(BuildDocumentXmlTest, ContainsName) {
    auto resume = makeMinimalResume();
    std::string xml = DOCXExporterTestable::buildDocumentXml(resume);
    EXPECT_NE(xml.find("Jane Doe"), std::string::npos);
}

TEST(BuildDocumentXmlTest, ContainsEmail) {
    auto resume = makeMinimalResume();
    std::string xml = DOCXExporterTestable::buildDocumentXml(resume);
    EXPECT_NE(xml.find("jane@example.com"), std::string::npos);
}

TEST(BuildDocumentXmlTest, ContainsPhone) {
    auto resume = makeMinimalResume();
    std::string xml = DOCXExporterTestable::buildDocumentXml(resume);
    EXPECT_NE(xml.find("+1-555-123-4567"), std::string::npos);
}

TEST(BuildDocumentXmlTest, VisibleSummaryIncluded) {
    auto resume = makeMinimalResume();
    resume.sections.append(makeSummarySection("I am a great engineer."));
    std::string xml = DOCXExporterTestable::buildDocumentXml(resume);
    EXPECT_NE(xml.find("I am a great engineer."), std::string::npos);
    EXPECT_NE(xml.find("Summary"), std::string::npos);
}

TEST(BuildDocumentXmlTest, HiddenSummaryExcluded) {
    auto resume = makeMinimalResume();
    resume.sections.append(makeSummarySection("Secret text", false));
    std::string xml = DOCXExporterTestable::buildDocumentXml(resume);
    EXPECT_EQ(xml.find("Secret text"), std::string::npos);
}

TEST(BuildDocumentXmlTest, SkillsCategoryAndItemsRendered) {
    auto resume = makeMinimalResume();
    resume.sections.append(makeSkillsSection());
    std::string xml = DOCXExporterTestable::buildDocumentXml(resume);
    EXPECT_NE(xml.find("Languages"), std::string::npos);
    EXPECT_NE(xml.find("Python"),    std::string::npos);
    EXPECT_NE(xml.find("C++"),       std::string::npos);
}

TEST(BuildDocumentXmlTest, ExperienceBulletsRendered) {
    auto resume = makeMinimalResume();
    resume.sections.append(makeExperienceSection());
    std::string xml = DOCXExporterTestable::buildDocumentXml(resume);
    EXPECT_NE(xml.find("Built APIs"), std::string::npos);
}

TEST(BuildDocumentXmlTest, IsValidXmlShell) {
    auto resume = makeMinimalResume();
    std::string xml = DOCXExporterTestable::buildDocumentXml(resume);
    EXPECT_NE(xml.find("<?xml"), std::string::npos);
    EXPECT_NE(xml.find("<w:document"), std::string::npos);
    EXPECT_NE(xml.find("</w:document>"), std::string::npos);
}

TEST(BuildDocumentXmlTest, SpecialCharsInNameEscaped) {
    auto resume = makeMinimalResume();
    resume.name = "Jane & John Doe";
    std::string xml = DOCXExporterTestable::buildDocumentXml(resume);
    EXPECT_NE(xml.find("&amp;"), std::string::npos);
}

// ── generate (ZIP output) ─────────────────────────────────────────────────────

TEST(DOCXGenerateTest, OutputIsNonEmpty) {
    auto resume = makeMinimalResume();
    auto result = DOCXExporter().generate(resume);
    EXPECT_GT(result.size(), 0u);
}

TEST(DOCXGenerateTest, OutputStartsWithZipSignature) {
    auto resume = makeMinimalResume();
    auto result = DOCXExporter().generate(resume);
    EXPECT_TRUE(containsZipSignature(result));
}

TEST(DOCXGenerateTest, OutputContainsEOCDSignature) {
    auto resume = makeMinimalResume();
    auto result = DOCXExporter().generate(resume);
    EXPECT_TRUE(containsEOCDSignature(result));
}

TEST(DOCXGenerateTest, MimeTypeIsDocx) {
    EXPECT_EQ(DOCXExporter().mimeType(),
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
}

TEST(DOCXGenerateTest, FileExtensionIsDocx) {
    EXPECT_EQ(DOCXExporter().fileExtension(), ".docx");
}

// ── zipFiles ──────────────────────────────────────────────────────────────────

TEST(ZipFilesTest, SingleFileProducesValidZip) {
    std::vector<std::pair<std::string, std::string>> files = {
        {"hello.txt", "Hello, World!"}
    };
    auto result = DOCXExporterTestable::zipFiles(files);
    EXPECT_TRUE(containsZipSignature(result));
    EXPECT_TRUE(containsEOCDSignature(result));
}

TEST(ZipFilesTest, MultipleFilesProducesValidZip) {
    std::vector<std::pair<std::string, std::string>> files = {
        {"[Content_Types].xml", "<Types/>"},
        {"_rels/.rels",         "<Relationships/>"},
        {"word/document.xml",   "<doc/>"},
    };
    auto result = DOCXExporterTestable::zipFiles(files);
    EXPECT_TRUE(containsZipSignature(result));
    EXPECT_TRUE(containsEOCDSignature(result));
}

TEST(ZipFilesTest, LargeContentCompressed) {
    std::string content(50000, 'A');  // highly compressible
    std::vector<std::pair<std::string, std::string>> files = {{"data.xml", content}};
    auto result = DOCXExporterTestable::zipFiles(files);
    // Compressed result must be much smaller than uncompressed
    EXPECT_LT(result.size(), content.size());
}
