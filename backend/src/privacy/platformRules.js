/**
 * privacy/platformRules.js — Platform-specific content rules for violation detection.
 *
 * Each platform defines:
 *  - maxDuration      : max video length in seconds
 *  - allowedAspectRatios
 *  - maxFileSize      : MB
 *  - contentRules     : array of rule objects
 *  - copyrightPolicy  : description
 *  - takedownUrl      : where to submit disputes
 */

const PLATFORM_RULES = {
  youtube: {
    name:             "YouTube",
    maxDuration:      43200, // 12 hours
    allowedAspects:   ["16:9", "9:16", "1:1", "4:3"],
    maxFileSizeMB:    256000,
    copyrightPolicy:  "Content ID system — automatic matching against rights holder database",
    takedownUrl:      "https://www.youtube.com/copyright_complaint_form",
    contentRules: [
      { id: "yt_face_consent",   label: "Face Consent",    description: "Identifiable persons must consent to being featured" },
      { id: "yt_copyright_audio", label: "Audio Copyright", description: "Background music must be licensed or royalty-free" },
      { id: "yt_copyright_video", label: "Video Copyright", description: "Clips from copyrighted content require fair use justification" },
      { id: "yt_child_safety",   label: "Child Safety",    description: "Content featuring minors must comply with COPPA" },
      { id: "yt_spam",           label: "Misleading",      description: "Content must not mislead viewers" },
    ],
  },

  instagram: {
    name:             "Instagram",
    maxDuration:      3600,
    allowedAspects:   ["1:1", "4:5", "9:16", "16:9"],
    maxFileSizeMB:    4096,
    copyrightPolicy:  "Rights Manager — automated + manual review",
    takedownUrl:      "https://www.facebook.com/help/contact/1385085308456471",
    contentRules: [
      { id: "ig_face_consent",   label: "Face Consent",    description: "Clear photos of people require their consent" },
      { id: "ig_music_rights",   label: "Music Rights",    description: "Only use music licensed through Instagram's music library" },
      { id: "ig_reels_license",  label: "Reels Licensing", description: "Original content only — no re-uploaded third-party content" },
      { id: "ig_harassment",     label: "Harassment",      description: "No content targeting individuals without consent" },
    ],
  },

  tiktok: {
    name:             "TikTok",
    maxDuration:      600, // 10 minutes
    allowedAspects:   ["9:16", "1:1"],
    maxFileSizeMB:    4096,
    copyrightPolicy:  "Automated detection + manual review; DMCA takedown supported",
    takedownUrl:      "https://www.tiktok.com/legal/report/Copyright",
    contentRules: [
      { id: "tt_face_privacy",  label: "Face Privacy",    description: "Do not publish identifiable individuals without consent" },
      { id: "tt_music_sync",    label: "Music Sync",      description: "Only TikTok-licensed music or original audio" },
      { id: "tt_duet_rights",   label: "Duet Rights",     description: "Duet/Stitch requires original creator permission" },
      { id: "tt_minor_safety",  label: "Minor Safety",    description: "No identifiable minors without guardian consent" },
    ],
  },

  facebook: {
    name:             "Facebook",
    maxDuration:      14400,
    allowedAspects:   ["16:9", "1:1", "9:16"],
    maxFileSizeMB:    10240,
    copyrightPolicy:  "Rights Manager with video fingerprinting",
    takedownUrl:      "https://www.facebook.com/help/contact/1385085308456471",
    contentRules: [
      { id: "fb_face_consent", label: "Face Consent",    description: "Tagging or featuring identifiable persons needs consent" },
      { id: "fb_copyright",    label: "Copyright",       description: "No copyrighted material without license" },
      { id: "fb_privacy",      label: "Privacy Policy",  description: "Content must comply with EU GDPR for EU users" },
    ],
  },
};

module.exports = PLATFORM_RULES;
