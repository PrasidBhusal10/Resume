// Shared test data — kept here so all specs draw from a single source of truth

export const TEST_USER = {
  name:     "Test User",
  email:    `test+${Date.now()}@playwright.dev`,
  password: "TestPass123!",
};

// A fresh email is generated per test run to avoid conflicts on repeated runs.
// For auth setup (which runs once), we use a seeded static account:
export const SEEDED_USER = {
  email:    "playwright@resumeai.dev",
  password: "PlaywrightTest99!",
};

export const SAMPLE_JD = `
Senior Software Engineer — Backend

About the role:
We are looking for a Senior Software Engineer to join our infrastructure team.
You will design, build and maintain high-performance backend services that power
our real-time data platform.

Requirements:
• 5+ years of experience in backend development
• Strong proficiency in Go, Python, or C++
• Experience with distributed systems and microservices
• Hands-on knowledge of Kubernetes, Docker and CI/CD pipelines
• Proficiency with SQL databases (PostgreSQL, MySQL)
• Familiarity with message queues (Kafka, RabbitMQ)
• Experience with REST API design and gRPC
• Strong problem-solving and communication skills

Nice to have:
• Experience with Rust
• Contributions to open-source projects
• Knowledge of ML infrastructure
`;

export const RESUME_TITLE = "Playwright Test Resume";
