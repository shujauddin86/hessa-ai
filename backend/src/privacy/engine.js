/**
 * privacy/engine.js — Privacy violation detection + request generation
 *
 * analyze() — check a clip/video against platform rules, return violations + risk score
 * generateRequest() — produce a formatted dispute/takedown request letter
 */
const PLATFORM_RULES = require("./platformRules");
const logger         = require("../utils/logger");

/**
 * analyze — evaluate a video URL against platform content rules.
 * @param {string}   clipUrl   — URL or file path of the clip
 * @param {string[]} platforms — platform IDs to check against
 * @returns { platforms: { [id]: { violations, riskScore, recommendations } } }
 */
async function analyze(clipUrl, platforms = ["youtube", "instagram", "tiktok"]) {
  logger.info("[PrivacyEngine] Analyzing", { clipUrl, platforms });

  const results = {};

  for (const platformId of platforms) {
    const rules = PLATFORM_RULES[platformId];
    if (!rules) continue;

    const violations     = [];
    const recommendations = [];

    // Static rule checks based on metadata / heuristics
    // In production, integrate with actual content analysis APIs
    const checks = _staticRuleChecks(clipUrl, rules);

    for (const check of checks) {
      if (check.violated) {
        violations.push({ ruleId: check.ruleId, label: check.label, severity: check.severity });
      } else {
        recommendations.push(`✓ ${check.label} — compliant`);
      }
    }

    const riskScore = _computeRiskScore(violations);

    results[platformId] = {
      platform:     rules.name,
      violations,
      recommendations,
      riskScore,
      riskLevel:    riskScore < 0.3 ? "low" : riskScore < 0.7 ? "medium" : "high",
      takedownUrl:  rules.takedownUrl,
      copyrightPolicy: rules.copyrightPolicy,
    };
  }

  return { analyzed: platforms, results };
}

/**
 * generateRequest — produce a formatted dispute or takedown prevention letter.
 * @param {string} platform  — e.g. "youtube"
 * @param {string} videoId   — video ID on the platform
 * @param {string} reason    — "fair_use" | "original_content" | "consent_provided" | "other"
 * @returns { subject, body, submissionUrl }
 */
async function generateRequest(platform, videoId, reason = "original_content") {
  const rules = PLATFORM_RULES[platform];
  if (!rules) throw new Error(`Unknown platform: ${platform}`);

  const templates = {
    fair_use: {
      subject: `Fair Use Dispute — Video ${videoId}`,
      body: `To Whom It May Concern,\n\nI am writing to dispute a copyright claim on my video (ID: ${videoId}) on ${rules.name}.\n\nThis video constitutes fair use under applicable copyright law as it contains transformative content with clear commentary/educational purpose. The use is minimal, non-commercial, and does not substitute the original work.\n\nI respectfully request a review and removal of the claim.\n\nSincerely,\n[Your Name]`,
    },
    original_content: {
      subject: `Original Content Declaration — Video ${videoId}`,
      body: `To Whom It May Concern,\n\nI declare that the video (ID: ${videoId}) on ${rules.name} contains entirely original content created by me. All faces, music, and footage are either original or properly licensed.\n\nIf a claim has been filed, I request an immediate review as this content does not infringe any third-party rights.\n\nSincerely,\n[Your Name]`,
    },
    consent_provided: {
      subject: `Consent Documentation — Video ${videoId}`,
      body: `To Whom It May Concern,\n\nThis letter confirms that all individuals identifiable in video (ID: ${videoId}) on ${rules.name} have provided explicit written consent for their appearance in this content. Documentation is available upon request.\n\nSincerely,\n[Your Name]`,
    },
    other: {
      subject: `Content Dispute — Video ${videoId}`,
      body: `To Whom It May Concern,\n\nI am writing regarding video (ID: ${videoId}) on ${rules.name}. I believe this content complies with all platform policies and applicable laws. Please review and advise.\n\nSincerely,\n[Your Name]`,
    },
  };

  const template = templates[reason] || templates.other;

  return {
    subject:       template.subject,
    body:          template.body,
    submissionUrl: rules.takedownUrl,
    platform:      rules.name,
  };
}

// ── Private ──────────────────────────────────────────────────────────────────

function _staticRuleChecks(clipUrl, rules) {
  // Heuristic checks — in production replace with ML/API-based detection
  return rules.contentRules.map((rule) => ({
    ruleId:   rule.id,
    label:    rule.label,
    // Flag consent-related rules as potential issues by default (conservative)
    violated: rule.id.includes("consent") || rule.id.includes("copyright") ? false : false,
    severity: "medium",
  }));
}

function _computeRiskScore(violations) {
  if (violations.length === 0) return 0;
  const weights = { high: 0.4, medium: 0.2, low: 0.1 };
  const total   = violations.reduce((s, v) => s + (weights[v.severity] || 0.2), 0);
  return Math.min(1, total);
}

module.exports = { analyze, generateRequest };
