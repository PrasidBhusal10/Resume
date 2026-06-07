/**
 * test_jwt_helper.cpp
 *
 * Unit tests for JWTHelper: sign(), verify(), base64url round-trip,
 * and tamper / expiry edge cases.
 */

#include <gtest/gtest.h>
#include <cstdlib>
#include <cstring>
#include <thread>
#include <chrono>

#include "utils/JWTHelper.h"

// ── Fixture ───────────────────────────────────────────────────────────────────

class JWTHelperTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Use a deterministic secret so tests don't depend on environment
        setenv("JWT_SECRET", "test-secret-key-for-unit-tests", 1);
    }

    JWTClaims validClaims() {
        JWTClaims c;
        c.userId    = 42;
        c.email     = "alice@example.com";
        c.isPremium = false;
        return c;
    }
};

// ── sign() / verify() round-trip ──────────────────────────────────────────────

TEST_F(JWTHelperTest, SignAndVerifyRoundTrip) {
    auto token  = JWTHelper::sign(validClaims(), 3600);
    auto result = JWTHelper::verify(token);

    ASSERT_TRUE(result.has_value());
    EXPECT_EQ(result->userId,    42u);
    EXPECT_EQ(result->email,     "alice@example.com");
    EXPECT_FALSE(result->isPremium);
}

TEST_F(JWTHelperTest, PremiumFlagPreserved) {
    JWTClaims claims = validClaims();
    claims.isPremium = true;
    auto token  = JWTHelper::sign(claims, 3600);
    auto result = JWTHelper::verify(token);

    ASSERT_TRUE(result.has_value());
    EXPECT_TRUE(result->isPremium);
}

TEST_F(JWTHelperTest, UserIdPreserved) {
    JWTClaims claims = validClaims();
    claims.userId = 999999;
    auto token  = JWTHelper::sign(claims, 3600);
    auto result = JWTHelper::verify(token);

    ASSERT_TRUE(result.has_value());
    EXPECT_EQ(result->userId, 999999u);
}

TEST_F(JWTHelperTest, EmailWithSpecialCharactersPreserved) {
    JWTClaims claims = validClaims();
    claims.email = "user+tag@sub.domain.co.uk";
    auto token  = JWTHelper::sign(claims, 3600);
    auto result = JWTHelper::verify(token);

    ASSERT_TRUE(result.has_value());
    EXPECT_EQ(result->email, "user+tag@sub.domain.co.uk");
}

// ── Token format ──────────────────────────────────────────────────────────────

TEST_F(JWTHelperTest, TokenHasThreeParts) {
    auto token = JWTHelper::sign(validClaims(), 3600);
    int dots = 0;
    for (char c : token) if (c == '.') ++dots;
    EXPECT_EQ(dots, 2);
}

TEST_F(JWTHelperTest, TokenContainsNoBase64Padding) {
    auto token = JWTHelper::sign(validClaims(), 3600);
    EXPECT_EQ(token.find('='), std::string::npos);
}

TEST_F(JWTHelperTest, TokenIsURLSafe) {
    auto token = JWTHelper::sign(validClaims(), 3600);
    // No '+' or '/' allowed in URL-safe base64
    EXPECT_EQ(token.find('+'), std::string::npos);
    EXPECT_EQ(token.find('/'), std::string::npos);
}

// ── Expiry handling ───────────────────────────────────────────────────────────

TEST_F(JWTHelperTest, ExpiredTokenIsRejected) {
    // Sign with 1-second lifetime then wait for expiry
    auto token = JWTHelper::sign(validClaims(), -1);  // already expired
    auto result = JWTHelper::verify(token);
    EXPECT_FALSE(result.has_value());
}

TEST_F(JWTHelperTest, FreshTokenIsAccepted) {
    auto token = JWTHelper::sign(validClaims(), 86400);
    EXPECT_TRUE(JWTHelper::verify(token).has_value());
}

// ── Tamper detection ──────────────────────────────────────────────────────────

TEST_F(JWTHelperTest, TamperedSignatureIsRejected) {
    auto token = JWTHelper::sign(validClaims(), 3600);
    // Flip the last character of the signature
    std::string bad = token;
    bad.back() = (bad.back() == 'A') ? 'B' : 'A';
    EXPECT_FALSE(JWTHelper::verify(bad).has_value());
}

TEST_F(JWTHelperTest, TamperedPayloadIsRejected) {
    auto token = JWTHelper::sign(validClaims(), 3600);
    // Find the payload section (between first and second dot) and mutate it
    auto dot1 = token.find('.');
    auto dot2 = token.find('.', dot1 + 1);
    std::string bad = token;
    if (dot1 + 2 < dot2) bad[dot1 + 2] = (bad[dot1 + 2] == 'A') ? 'B' : 'A';
    EXPECT_FALSE(JWTHelper::verify(bad).has_value());
}

TEST_F(JWTHelperTest, TruncatedTokenIsRejected) {
    auto token = JWTHelper::sign(validClaims(), 3600);
    std::string truncated = token.substr(0, token.size() / 2);
    EXPECT_FALSE(JWTHelper::verify(truncated).has_value());
}

// ── Invalid token formats ─────────────────────────────────────────────────────

TEST_F(JWTHelperTest, EmptyStringIsRejected) {
    EXPECT_FALSE(JWTHelper::verify("").has_value());
}

TEST_F(JWTHelperTest, RandomStringIsRejected) {
    EXPECT_FALSE(JWTHelper::verify("not.a.token").has_value());
}

TEST_F(JWTHelperTest, OnlyTwoPartsIsRejected) {
    EXPECT_FALSE(JWTHelper::verify("header.payload").has_value());
}

TEST_F(JWTHelperTest, NullByteInTokenIsRejected) {
    std::string bad("abc\0def.ghi.jkl", 15);
    EXPECT_FALSE(JWTHelper::verify(bad).has_value());
}

// ── Secret key isolation ──────────────────────────────────────────────────────

TEST_F(JWTHelperTest, TokenSignedWithDifferentSecretIsRejected) {
    setenv("JWT_SECRET", "secret-A", 1);
    auto token = JWTHelper::sign(validClaims(), 3600);

    setenv("JWT_SECRET", "secret-B", 1);
    EXPECT_FALSE(JWTHelper::verify(token).has_value());

    // Restore
    setenv("JWT_SECRET", "test-secret-key-for-unit-tests", 1);
}
