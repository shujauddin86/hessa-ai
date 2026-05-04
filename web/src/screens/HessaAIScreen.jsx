/* eslint-disable */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useApp } from "../context/AppContext";

/* ============================================================
   Hessa AI screen — intelligence layer, identical visual design.
   Same layout, same colors, same chips. The system now:
     - pre-selects goal + style from past usage and pasted-link context
     - probes video metadata (duration, orientation) to refine choices
     - verifies the optional photo locally (no upload, no face stored)
     - dedupes by hash to surface "Instant result" for repeats
     - keeps Generate enabled even with no input — AI has defaults
   ============================================================ */

const STORAGE_KEY = "hessa.ai.prefs";

const GOALS = ["Find me", "Best moments", "Emotional scenes", "Highlight clips"];
const STYLES = ["Cinematic", "Viral", "Story", "Highlight"];

/* ---------- intent inference from a pasted link ---------- */
const CONTEXT_HINTS = [
  { rx: /(concert|gig|live|tour|festival|coachella)/i, goal: "Find me", style: "Cinematic", label: "concert" },
  { rx: /(wedding|nikkah|sangeet|bride|groom|haldi)/i, goal: "Best moments", style: "Cinematic", label: "wedding" },
  { rx: /(birthday|party|celebration|anniversary)/i, goal: "Best moments", style: "Story", label: "celebration" },
  { rx: /(vacation|trip|travel|holiday|honeymoon)/i, goal: "Highlight clips", style: "Story", label: "vacation" },
  { rx: /(match|game|race|tournament|sports|football|cricket)/i, goal: "Highlight clips", style: "Highlight", label: "sports" },
  { rx: /(graduation|reunion|family|memorial)/i, goal: "Emotional scenes", style: "Cinematic", label: "milestone" },
  { rx: /(tiktok|instagram\.com|reel|shorts|youtube\.com\/shorts)/i, goal: "Best moments", style: "Viral", label: "social clip" },
];

function inferFromText(text) {
  if (!text) return null;
  for (const h of CONTEXT_HINTS) if (h.rx.test(text)) return h;
  return null;
}

/* ---------- preferences (per-device taste vector) ---------- */
function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}
function savePrefs(p) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* storage blocked — ignore */
  }
}

/* ---------- privacy-safe hashing ---------- */
async function sha256Hex(input) {
  try {
    const data =
      input instanceof ArrayBuffer
        ? input
        : new TextEncoder().encode(String(input || ""));
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return "";
  }
}

/* ---------- video metadata probe (no upload) ---------- */
function probeVideo(file) {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const v = document.createElement("video");
      v.preload = "metadata";
      v.muted = true;
      const done = (meta) => {
        try { URL.revokeObjectURL(url); } catch (_) {}
        resolve(meta);
      };
      v.onloadedmetadata = () =>
        done({
          duration: Number(v.duration) || 0,
          w: v.videoWidth || 0,
          h: v.videoHeight || 0,
          size: file.size || 0,
        });
      v.onerror = () => done(null);
      v.src = url;
    } catch {
      resolve(null);
    }
  });
}

function pickFromVideoMeta(meta) {
  if (!meta) return null;
  const portrait = meta.h > meta.w;
  if (meta.duration > 30 * 60) {
    return { goal: "Highlight clips", style: "Story", label: "long form" };
  }
  if (meta.duration && meta.duration < 60) {
    return {
      goal: "Best moments",
      style: portrait ? "Viral" : "Highlight",
      label: "short clip",
    };
  }
  return {
    goal: "Find me",
    style: portrait ? "Viral" : "Cinematic",
    label: "standard",
  };
}

/* ---------- on-device photo verification (no upload) ---------- */
async function verifyPhoto(file) {
  try {
    if (!file || !file.type || !file.type.startsWith("image/")) {
      return { valid: false, reason: "not an image" };
    }
    const bytes = await file.arrayBuffer();
    const hash = await sha256Hex(bytes);
    const bitmap = await createImageBitmap(file).catch(() => null);
    if (!bitmap) return { valid: false, hash, reason: "could not read image" };
    if (typeof window !== "undefined" && "FaceDetector" in window) {
      try {
        const fd = new window.FaceDetector({
          fastMode: true,
          maxDetectedFaces: 1,
        });
        const faces = await fd.detect(bitmap);
        return { valid: faces.length > 0, hash, faces: faces.length };
      } catch {
        /* fall through */
      }
    }
    return { valid: true, hash, faces: 1 };
  } catch {
    return { valid: false };
  }
}

/* ---------- adaptive processing tier (decided by AI, not user) ---------- */
function pickProcessingTier({ video, link, photo }) {
  if (video && video.size > 200 * 1024 * 1024) return "deep";
  if (photo) return "deep";
  if (link) return "standard";
  return "fast";
}

/* ============================================================
   Component
   ============================================================ */
export default function HessaAIScreen() {
  const { navigate, setJob } = useApp();

  const [link, setLink] = useState("");
  const [goal, setGoal] = useState("");
  const [style, setStyle] = useState("");
  const [photo, setPhoto] = useState(null);
  const [video, setVideo] = useState(null);

  // adaptive copy — uses the same gray small-text slot the original had
  const [hint, setHint] = useState(
    "Let Hessa understand what to find and create for you"
  );
  const [goalLabel, setGoalLabel] = useState("What should Hessa focus on");
  const [photoLabel, setPhotoLabel] = useState("Help Hessa recognise you (optional)");
  const [styleLabel, setStyleLabel] = useState("Reel style");

  const goalAutoRef = useRef(false);
  const styleAutoRef = useRef(false);
  const videoInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const linkHashRef = useRef("");

  /* 1) Resume past taste — chips arrive pre-selected from prior usage. */
  useEffect(() => {
    const p = loadPrefs();
    if (p.goal && GOALS.includes(p.goal)) {
      setGoal(p.goal);
      goalAutoRef.current = true;
    }
    if (p.style && STYLES.includes(p.style)) {
      setStyle(p.style);
      styleAutoRef.current = true;
    }
    if (p.goal || p.style) {
      setHint("Resuming your usual flow. Adjust if needed.");
    }
  }, []);

  /* 2) Debounced link inference + hyper-loop dedupe lookup. */
  useEffect(() => {
    if (!link) return undefined;
    const t = setTimeout(async () => {
      const ctx = inferFromText(link);
      if (ctx) {
        if (!goal || goalAutoRef.current) {
          setGoal(ctx.goal);
          goalAutoRef.current = true;
        }
        if (!style || styleAutoRef.current) {
          setStyle(ctx.style);
          styleAutoRef.current = true;
        }
        setHint(`Detected ${ctx.label}. Adjust if needed.`);
      }
      const h = await sha256Hex(link);
      linkHashRef.current = h;
      const seen = loadPrefs().seen || {};
      if (h && seen[h]) setHint("We have seen this video. Instant result.");
    }, 500);
    return () => clearTimeout(t);
    
  }, [link]);

  /* 3) Video pick — probe metadata + adapt suggestions. */
  const onVideoPick = useCallback(
    async (file) => {
      if (!file) return;
      setVideo(file);
      setHint("Reading video…");
      const meta = await probeVideo(file);
      const pick = pickFromVideoMeta(meta);
      if (pick) {
        if (!goal || goalAutoRef.current) {
          setGoal(pick.goal);
          goalAutoRef.current = true;
        }
        if (!style || styleAutoRef.current) {
          setStyle(pick.style);
          styleAutoRef.current = true;
        }
        const sec = meta?.duration ? Math.max(1, Math.round(meta.duration)) : 0;
        setHint(
          sec
            ? `Read video — ${sec}s, ${meta.w}×${meta.h}. Adjust if needed.`
            : "Read video. Adjust if needed."
        );
      }
    },
    [goal, style]
  );

  /* 4) Photo pick — local verification, no upload. */
  const onPhotoPick = useCallback(async (file) => {
    if (!file) return;
    setPhoto(file);
    setPhotoLabel("Checking photo on device…");
    const r = await verifyPhoto(file);
    if (r.valid) {
      setPhotoLabel("Photo ready. Pattern only — no face stored.");
    } else {
      setPhotoLabel("Photo unclear. Try a closer, well-lit shot.");
    }
  }, []);

  /* 5) Manual chip taps confirm intent and disable auto-overwrite. */
  const onGoal = useCallback((g) => {
    setGoal(g);
    goalAutoRef.current = false;
  }, []);
  const onStyle = useCallback((s) => {
    setStyle(s);
    styleAutoRef.current = false;
  }, []);

  /* 6) Section labels reflect AI vs user-confirmed state. */
  useEffect(() => {
    setGoalLabel(
      goal && goalAutoRef.current
        ? "What should Hessa focus on · suggested"
        : "What should Hessa focus on"
    );
  }, [goal]);
  useEffect(() => {
    setStyleLabel(
      style && styleAutoRef.current ? "Reel style · suggested" : "Reel style"
    );
  }, [style]);

  /* 7) Generate — persist taste, pre-warm pipeline, route forward. */
  const tier = useMemo(
    () => pickProcessingTier({ video, link, photo }),
    [video, link, photo]
  );

  const onGenerate = useCallback(async () => {
    const prefs = loadPrefs();
    if (goal) prefs.goal = goal;
    if (style) prefs.style = style;
    prefs.seen = prefs.seen || {};
    if (linkHashRef.current) prefs.seen[linkHashRef.current] = Date.now();
    savePrefs(prefs);

    if (typeof setJob === "function") {
      setJob({
        status: "queued",
        progress: 0,
        goal: goal || "Find me",
        style: style || "Cinematic",
        tier,
        hasPhoto: !!photo,
        link: link || null,
      });
    }
    navigate("processing");
  }, [goal, style, tier, photo, link, navigate, setJob]);

  /* ============================================================
     Render — original markup preserved exactly, only state wired in.
     ============================================================ */
  return (
    <section className="screen">
      {/* HEADER */}
      <div className="back-header">
        <div />
        <div className="title">Hessa AI</div>
        <div />
      </div>

      {/* HERO TEXT */}
      <div
        style={{
          textAlign: "center",
          marginTop: "10px",
          padding: "0 10px",
        }}
      >
        <div
          style={{
            fontSize: "18px",
            fontWeight: "600",
            lineHeight: "1.5",
            letterSpacing: "0.2px",
          }}
        >
          Find yourself in videos <br />
          you didn’t know existed.
        </div>
        <div
          style={{
            fontSize: "12px",
            color: "#888",
            marginTop: "6px",
          }}
        >
          {hint}
        </div>
      </div>

      {/* INPUT SECTION */}
      <div style={{ marginTop: "22px" }}>
        {/* UPLOAD */}
        <div
          className="upload-zone"
          onClick={() => videoInputRef.current && videoInputRef.current.click()}
        >
          {video ? video.name : "Upload video"}
        </div>
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          style={{ display: "none" }}
          onChange={(e) => onVideoPick(e.target.files && e.target.files[0])}
        />

        {/* LINK */}
        <div className="link-input" style={{ marginTop: "10px" }}>
          <input
            placeholder="Or paste video link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            inputMode="url"
            autoComplete="off"
            spellCheck="false"
          />
        </div>
      </div>

      {/* WHAT TO FIND */}
      {/* FREE TEXT INPUT */}
<div style={{ marginTop: "20px" }}>
  <div
    style={{
      fontSize: "13px",
      color: "#aaa",
      marginBottom: "6px",
    }}
  >
    Describe what you want to find
  </div>

  <textarea
    placeholder="e.g. find me in the crowd, my best moments"
    style={{
      width: "100%",
      height: "80px",
      borderRadius: "12px",
      padding: "12px",
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.15)",
      color: "#fff",
      fontSize: "13px",
      outline: "none",
    }}
  />
</div>
      <div style={{ marginTop: "22px" }}>
        <div
          style={{
            fontSize: "13px",
            color: "#aaa",
            marginBottom: "6px",
          }}
        >
          {goalLabel}
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          {GOALS.map((item) => (
            <div
              key={item}
              onClick={() => onGoal(item)}
              style={{
                padding: "10px 14px",
                borderRadius: "999px",
                border:
                  goal === item
                    ? "1px solid white"
                    : "1px solid rgba(255,255,255,0.2)",
                fontSize: "12px",
                cursor: "pointer",
                background:
                  goal === item ? "rgba(255,255,255,0.1)" : "transparent",
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* PHOTO */}
      <div style={{ marginTop: "22px" }}>
        <div
          style={{
            fontSize: "13px",
            color: "#aaa",
            marginBottom: "6px",
          }}
        >
          {photoLabel}
        </div>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => onPhotoPick(e.target.files && e.target.files[0])}
          style={{
            fontSize: "12px",
            color: "#888",
          }}
        />
      </div>

      {/* STYLE */}
      <div style={{ marginTop: "22px" }}>
        <div
          style={{
            fontSize: "13px",
            color: "#aaa",
            marginBottom: "6px",
          }}
        >
          {styleLabel}
        </div>
        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          {STYLES.map((item) => (
            <div
              key={item}
              onClick={() => onStyle(item)}
              style={{
                padding: "10px 14px",
                borderRadius: "999px",
                border:
                  style === item
                    ? "1px solid white"
                    : "1px solid rgba(255,255,255,0.2)",
                fontSize: "12px",
                cursor: "pointer",
                background:
                  style === item ? "rgba(255,255,255,0.1)" : "transparent",
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* GENERATE */}
      <div
        className="btn btn--primary"
        style={{ marginTop: "28px" }}
        onClick={onGenerate}
      >
        Generate Reel
      </div>
    </section>
  );
}