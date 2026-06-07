/**
 * test_tex_exporter.cpp
 *
 * Unit tests for TeXExporter:
 * - escapeTeX: all 10 special LaTeX characters
 * - renderSections: visibility gating, section order, output structure
 * - generate: placeholder substitution, {{SECTIONS}} replacement
 */

#include <gtest/gtest.h>
#include <json/json.h>
#include <string>
#include <algorithm>

#include "exporters/TeXExporter.h"

// ── Helpers ───────────────────────────────────────────────────────────────────

static Json::Value makeSection(const std::string& type,
                               const Json::Value& content,
                               bool visible = true) {
    Json::Value s;
    s["sectionType"] = type;
    s["isVisible"]   = visible;
    s["content"]     = content;
    return s;
}

static Json::Value makeSummaryContent(const std::string& text) {
    Json::Value c;
    c["text"] = text;
    return c;
}

static Json::Value makeSkillsContent() {
    Json::Value cat;
    cat["name"] = "Languages";
    cat["items"].append("Python");
    cat["items"].append("Go");
    Json::Value content;
    content["categories"].append(cat);
    return content;
}

static Json::Value makeExperienceContent() {
    Json::Value bullet1 = "Designed REST APIs serving 1M req/day";
    Json::Value bullet2 = "Reduced latency by 40% using caching";
    Json::Value item;
    item["role"]    = "Software Engineer";
    item["company"] = "TechCorp";
    item["start"]   = "Jan 2021";
    item["end"]     = "Present";
    item["bullets"].append(bullet1);
    item["bullets"].append(bullet2);
    Json::Value content;
    content["items"].append(item);
    return content;
}

// Helper to call the private-but-testable static methods via a subclass trick.
// Since all methods are private, we test them indirectly through generate().
// For escapeTeX we access it via a thin test shim compiled alongside.
//
// escapeTeX IS tested directly because it's declared private in the header.
// We expose it for testing by subclassing and making it public:
class TeXExporterTestable : public TeXExporter {
public:
    using TeXExporter::escapeTeX;
    using TeXExporter::renderSections;
};

// ── escapeTeX ─────────────────────────────────────────────────────────────────

class TeXEscapeTest : public ::testing::Test {};

TEST_F(TeXEscapeTest, AmpersandEscaped) {
    EXPECT_EQ(TeXExporterTestable::escapeTeX("a&b"), "a\\&b");
}

TEST_F(TeXEscapeTest, PercentEscaped) {
    EXPECT_EQ(TeXExporterTestable::escapeTeX("100%"), "100\\%");
}

TEST_F(TeXEscapeTest, DollarEscaped) {
    EXPECT_EQ(TeXExporterTestable::escapeTeX("$100"), "\\$100");
}

TEST_F(TeXEscapeTest, HashEscaped) {
    EXPECT_EQ(TeXExporterTestable::escapeTeX("C#"), "C\\#");
}

TEST_F(TeXEscapeTest, UnderscoreEscaped) {
    EXPECT_EQ(TeXExporterTestable::escapeTeX("snake_case"), "snake\\_case");
}

TEST_F(TeXEscapeTest, BracesEscaped) {
    EXPECT_EQ(TeXExporterTestable::escapeTeX("{key}"), "\\{key\\}");
}

TEST_F(TeXEscapeTest, TildeEscaped) {
    EXPECT_EQ(TeXExporterTestable::escapeTeX("foo~bar"), "foo\\textasciitilde{}bar");
}

TEST_F(TeXEscapeTest, CaretEscaped) {
    EXPECT_EQ(TeXExporterTestable::escapeTeX("x^2"), "x\\textasciicircum{}2");
}

TEST_F(TeXEscapeTest, BackslashEscaped) {
    EXPECT_EQ(TeXExporterTestable::escapeTeX("a\\b"), "a\\textbackslash{}b");
}

TEST_F(TeXEscapeTest, PlainTextUnchanged) {
    EXPECT_EQ(TeXExporterTestable::escapeTeX("Hello World"), "Hello World");
}

TEST_F(TeXEscapeTest, MixedSpecialChars) {
    std::string input  = "C++ & Python, 100% reliable";
    std::string result = TeXExporterTestable::escapeTeX(input);
    EXPECT_NE(result.find("\\&"),  std::string::npos);
    EXPECT_NE(result.find("\\%"),  std::string::npos);
}

TEST_F(TeXEscapeTest, EmptyStringReturnsEmpty) {
    EXPECT_EQ(TeXExporterTestable::escapeTeX(""), "");
}

// ── renderSections ────────────────────────────────────────────────────────────

class TeXRenderSectionsTest : public ::testing::Test {
protected:
    Json::Value sections;
};

TEST_F(TeXRenderSectionsTest, VisibleSectionIsIncluded) {
    sections.append(makeSection("summary", makeSummaryContent("A great engineer."), true));
    std::string output = TeXExporterTestable::renderSections(sections);
    EXPECT_NE(output.find("Summary"), std::string::npos);
    EXPECT_NE(output.find("A great engineer"), std::string::npos);
}

TEST_F(TeXRenderSectionsTest, HiddenSectionIsExcluded) {
    sections.append(makeSection("summary", makeSummaryContent("Hidden text"), false));
    std::string output = TeXExporterTestable::renderSections(sections);
    EXPECT_EQ(output.find("Hidden text"), std::string::npos);
}

TEST_F(TeXRenderSectionsTest, SectionsRenderedInOrder) {
    sections.append(makeSection("summary", makeSummaryContent("Summary text")));
    sections.append(makeSection("skills",  makeSkillsContent()));
    std::string output = TeXExporterTestable::renderSections(sections);
    auto posSum = output.find("Summary");
    auto posSki = output.find("Skills");
    EXPECT_LT(posSum, posSki);
}

TEST_F(TeXRenderSectionsTest, SkillsItemsRendered) {
    sections.append(makeSection("skills", makeSkillsContent()));
    std::string output = TeXExporterTestable::renderSections(sections);
    EXPECT_NE(output.find("Python"), std::string::npos);
    EXPECT_NE(output.find("Go"),     std::string::npos);
    EXPECT_NE(output.find("Languages"), std::string::npos);
}

TEST_F(TeXRenderSectionsTest, ExperienceRoleAndCompanyRendered) {
    sections.append(makeSection("experience", makeExperienceContent()));
    std::string output = TeXExporterTestable::renderSections(sections);
    EXPECT_NE(output.find("Software Engineer"), std::string::npos);
    EXPECT_NE(output.find("TechCorp"),          std::string::npos);
    EXPECT_NE(output.find("itemize"),           std::string::npos);
}

TEST_F(TeXRenderSectionsTest, SpecialCharsInContentAreEscaped) {
    sections.append(makeSection("summary", makeSummaryContent("5 years at Acme & Co.")));
    std::string output = TeXExporterTestable::renderSections(sections);
    EXPECT_NE(output.find("\\&"), std::string::npos);
    EXPECT_EQ(output.find(" & "), std::string::npos);
}

TEST_F(TeXRenderSectionsTest, EmptySectionsArrayReturnsEmpty) {
    std::string output = TeXExporterTestable::renderSections(sections);
    EXPECT_TRUE(output.empty());
}

// ── generate (placeholder substitution) ──────────────────────────────────────

class TeXGenerateTest : public ::testing::Test {
protected:
    ResumeData makeResume() {
        ResumeData r;
        r.name     = "Alice Smith";
        r.email    = "alice@example.com";
        r.phone    = "+1-555-000-1234";
        r.location = "San Francisco, CA";
        r.title    = "Software Engineer";
        r.texSource = "\\name{{{NAME}}} \\email{{{EMAIL}}} \\phone{{{PHONE}}} "
                      "\\location{{{LOCATION}}} \\title{{{TITLE}}} {{SECTIONS}}";
        r.sections = Json::Value(Json::arrayValue);
        return r;
    }
};

TEST_F(TeXGenerateTest, NamePlaceholderReplaced) {
    auto resume = makeResume();
    auto result = TeXExporter().generate(resume);
    std::string tex(result.begin(), result.end());
    EXPECT_NE(tex.find("Alice Smith"), std::string::npos);
    EXPECT_EQ(tex.find("{{NAME}}"),    std::string::npos);
}

TEST_F(TeXGenerateTest, AllPlaceholdersReplaced) {
    auto resume = makeResume();
    auto result = TeXExporter().generate(resume);
    std::string tex(result.begin(), result.end());
    EXPECT_EQ(tex.find("{{NAME}}"),     std::string::npos);
    EXPECT_EQ(tex.find("{{EMAIL}}"),    std::string::npos);
    EXPECT_EQ(tex.find("{{PHONE}}"),    std::string::npos);
    EXPECT_EQ(tex.find("{{LOCATION}}"), std::string::npos);
    EXPECT_EQ(tex.find("{{TITLE}}"),    std::string::npos);
    EXPECT_EQ(tex.find("{{SECTIONS}}"), std::string::npos);
}

TEST_F(TeXGenerateTest, SpecialCharsInNameAreEscaped) {
    auto resume = makeResume();
    resume.name = "O'Brien & Associates";
    auto result = TeXExporter().generate(resume);
    std::string tex(result.begin(), result.end());
    EXPECT_NE(tex.find("\\&"), std::string::npos);
}

TEST_F(TeXGenerateTest, ReturnsNonEmptyByteVector) {
    auto resume = makeResume();
    auto result = TeXExporter().generate(resume);
    EXPECT_GT(result.size(), 0u);
}

TEST_F(TeXGenerateTest, MimeTypeIsTeX) {
    EXPECT_EQ(TeXExporter().mimeType(), "application/x-tex");
}

TEST_F(TeXGenerateTest, FileExtensionIsTeX) {
    EXPECT_EQ(TeXExporter().fileExtension(), ".tex");
}
