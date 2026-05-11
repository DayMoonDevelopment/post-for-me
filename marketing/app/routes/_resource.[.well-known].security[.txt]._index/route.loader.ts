// Open source repositories in scope for security reports
const osRepos = [
  "https://github.com/DayMoonDevelopment/post-for-me",
  "https://github.com/DayMoonDevelopment/post-for-me-marketing",
  "https://github.com/DayMoonDevelopment/post-for-me-typescript",
  "https://github.com/DayMoonDevelopment/post-for-me-ruby",
  "https://github.com/DayMoonDevelopment/post-for-me-go",
  "https://github.com/DayMoonDevelopment/post-for-me-python",
  "https://github.com/DayMoonDevelopment/post-for-me-kotlin",
];

export function loader() {
  const securityContent = `# Security Policy for Post For Me

Contact: postforme@daymoon.dev
Expires: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
Preferred-Languages: en
Canonical: https://www.postforme.dev/.well-known/security.txt

# If you discover a security vulnerability, please report it to us
# We appreciate responsible disclosure and will work with you to address any issues

# Scope
# This policy applies to:
# - https://www.postforme.dev (Marketing site)
# - https://app.postforme.dev (Dashboard)
# - https://api.postforme.dev (API & Documentation)
#
# Open source repositories:
${osRepos.map((repo) => `# - ${repo}`).join("\n")}

# Out of scope:
# - Social engineering attacks
# - Physical attacks
# - Attacks requiring physical access to user devices
# - Issues in third-party social media platforms we integrate with
# - Issues in third-party analytics or monitoring services

# Guidelines
# Please provide detailed information about the vulnerability including:
# - Steps to reproduce
# - Potential impact
# - Any proof-of-concept code or screenshots
# - Affected components (marketing site, dashboard, API, etc.)

# We commit to:
# - Acknowledging your report within 24 hours
# - Providing regular updates on our progress
# - Crediting you for the discovery (if desired)
# - Working with you to understand and fix the issue

# Thank you for helping keep our users and their data safe!`;

  return new Response(securityContent, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=2592000, s-maxage=2592000", // 30 days
      "Content-Length": securityContent.length.toString(),
    },
  });
}
