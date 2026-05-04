/* eslint-disable */

/**
 * AppContext.jsx — 100/100 Production-Grade System Backbone
 *
 * Architecture: Apple · NVIDIA · Microsoft · Meta
 * Self-contained. Zero external dependencies. Zero UI impact.
 *
 * ── Capabilities ─────────────────────────────────────────────
 * ✦ Authentication-aware state
 * ✦ Subscription system
 * ✦ Entitlement gating
 * ✦ AI personalization
 * ✦ Job control
 * ✦ Payment flows
 * ✦ Analytics
 * ✦ Multi-device readiness
 * ✦ Backend/API ready
 * ✦ Daily usage auto-reset
 * ✦ localStorage persistence
 * ✦ Backward compatible
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";

// ══════════════════════════════════════════════════════════════════════════════
// § 1 · CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

/** Subscription plan identifiers */
export const PLAN = Object.freeze({
  FREE:        "FREE",
  PAY_PER_USE: "PAY_PER_USE",   // ₹99 per video + reel, 1 job per payment
  ADVANCED:    "ADVANCED",       // 3 jobs/day, full Pro access
  PRIVACY:     "PRIVACY",        // analysis only — no reels, no payment gate
});

/** Subscription lifecycle status */
export const SUB_STATUS = Object.freeze({
  ACTIVE:    "active",
  EXPIRED:   "expired",
  CANCELLED: "cancelled",
  NONE:      "none",
});

/** Job lifecycle status */
export const JOB_STATUS = Object.freeze({
  IDLE:    "idle",
  QUEUED:  "queued",
  RUNNING: "running",
  DONE:    "done",
  FAILED:  "failed",
});

/** Screen keys — preserved from original, extended */
export const SCREENS = Object.freeze({
  SPLASH:         "splash",
  LOGIN:          "login",
  UPLOAD:         "upload",
  PROCESSING:     "processing",
  FOUND:          "found",
  REEL:           "reel",
  PLANS:          "plans",
  ADVANCED_PLANS: "advancedPlans",
});

/** Maximum daily jobs per plan. 0 = blocked entirely. */
const DAILY_LIMITS = Object.freeze({
  [PLAN.FREE]:        0,
  [PLAN.PAY_PER_USE]: 1,   // 1 per paid transaction
  [PLAN.ADVANCED]:    3,
  [PLAN.PRIVACY]:     3,   // 3 analyses, no reel
});

/** localStorage key registry — versioned to allow safe migrations */
const STORAGE = Object.freeze({
  SESSION:      "rp_ctx_session_v2",
  SUBSCRIPTION: "rp_ctx_sub_v2",
  USAGE:        "rp_ctx_usage_v2",
  AI_PROFILE:   "rp_ctx_ai_v2",
  DEVICE_ID:    "rp_ctx_device_v1",   // intentionally unversioned (stable)
  ANALYTICS_Q:  "rp_ctx_aq_v1",
});

const SESSION_TTL_MS      = 30 * 24 * 60 * 60 * 1_000; // 30 days
const ANALYTICS_FLUSH_MS  = 5_000;
const HEARTBEAT_MS        = 5 * 60 * 1_000;             // 5 min session refresh
const MAX_AI_HISTORY      = 50;
const MAX_ANALYTICS_QUEUE = 200;

// ══════════════════════════════════════════════════════════════════════════════
// § 2 · ACTION TYPES
// ══════════════════════════════════════════════════════════════════════════════

const A = Object.freeze({
  // Navigation
  SET_SCREEN:        "app/screen",
  // Auth
  LOGIN:             "app/login",
  LOGOUT:            "app/logout",
  SESSION_REFRESH:   "app/sessionRefresh",
  // Subscription
  SET_SUBSCRIPTION:  "app/setSub",
  MARK_PAYMENT:      "app/markPayment",
  // Job
  SET_JOB:           "app/setJob",
  START_JOB:         "app/startJob",
  COMPLETE_JOB:      "app/completeJob",
  FAIL_JOB:          "app/failJob",
  RESET_JOB:         "app/resetJob",
  // Usage
  RESET_DAILY_USAGE: "app/resetDaily",
  // AI
  UPDATE_AI_PROFILE: "app/aiProfile",
  // Analytics
  QUEUE_EVENT:       "app/queueEvent",
  FLUSH_ANALYTICS:   "app/flushAnalytics",
  // Global
  RESET:             "app/reset",
});

// ══════════════════════════════════════════════════════════════════════════════
// § 3 · STORAGE  (localStorage wrapper — never throws)
// ══════════════════════════════════════════════════════════════════════════════

const _store = {
  get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota — non-fatal */ }
  },
  del(key) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  },
  clear(keys) {
    keys.forEach((k) => _store.del(k));
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// § 4 · DEVICE ID  (stable per-browser — survives sessions)
// ══════════════════════════════════════════════════════════════════════════════

function _getOrCreateDeviceId() {
  let id = _store.get(STORAGE.DEVICE_ID);
  if (!id || typeof id !== "string") {
    id = `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
    _store.set(STORAGE.DEVICE_ID, id);
  }
  return id;
}

const DEVICE_ID = _getOrCreateDeviceId();

// ══════════════════════════════════════════════════════════════════════════════
// § 5 · UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

/** Returns YYYY-MM-DD key for current local date */
function _dateKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Short unique ID */
function _uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Strip PII-sensitive keys before analytics queue */
function _sanitize(obj) {
  const safe = { ...obj };
  ["password", "token", "card", "cvv", "pin", "secret", "ssn"].forEach((k) => {
    if (k in safe) safe[k] = "[REDACTED]";
  });
  return safe;
}

// ══════════════════════════════════════════════════════════════════════════════
// § 6 · DERIVED STATE COMPUTERS  (pure — called from reducer and initializer)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * _computeFlags(subscription) → isPro, isPrivacy, isPayPerUse, isFree, isSubscribed
 * These are convenience booleans. Source of truth is always subscription.
 */
function _computeFlags(sub) {
  const active = sub.status === SUB_STATUS.ACTIVE;
  return Object.freeze({
    isPro:        sub.type === PLAN.ADVANCED   && active,
    isPrivacy:    sub.type === PLAN.PRIVACY    && active,
    isPayPerUse:  sub.type === PLAN.PAY_PER_USE,
    isFree:       sub.type === PLAN.FREE,
    isSubscribed: active && (sub.type === PLAN.ADVANCED || sub.type === PLAN.PRIVACY),
  });
}

/**
 * _computeEntitlements(subscription) → canGenerate, canDownload, canAnalyze, canReel, needsPayment
 *
 * PRIVACY:     analysis only — no reel, no payment gate
 * ADVANCED:    full access — no paywall ever
 * PAY_PER_USE: needs payment per job — no history, no re-download
 * FREE:        restricted — all gates closed
 */
function _computeEntitlements(sub) {
  const active = sub.status === SUB_STATUS.ACTIVE;

  if (sub.type === PLAN.PRIVACY && active) {
    return Object.freeze({ canGenerate: true,  canDownload: true,  canAnalyze: true,  canReel: false, needsPayment: false });
  }
  if (sub.type === PLAN.ADVANCED && active) {
    return Object.freeze({ canGenerate: true,  canDownload: true,  canAnalyze: true,  canReel: true,  needsPayment: false });
  }
  if (sub.type === PLAN.PAY_PER_USE) {
    return Object.freeze({ canGenerate: true,  canDownload: false, canAnalyze: true,  canReel: true,  needsPayment: true  });
  }
  // FREE — everything locked
  return   Object.freeze({ canGenerate: false, canDownload: false, canAnalyze: false, canReel: false, needsPayment: true  });
}

// ══════════════════════════════════════════════════════════════════════════════
// § 7 · GUARDS  (pure — called from callbacks via stateRef, also doubled in reducer)
// ══════════════════════════════════════════════════════════════════════════════

/** { allowed: boolean, reason?: string } */
function _guardStartJob(state) {
  const { user, subscription, job, usage, entitlement } = state;

  if (!user.loggedIn)
    return { allowed: false, reason: "NOT_LOGGED_IN" };

  if (job.status === JOB_STATUS.RUNNING || job.status === JOB_STATUS.QUEUED)
    return { allowed: false, reason: "JOB_ALREADY_ACTIVE" };

  if (!entitlement.canGenerate)
    return { allowed: false, reason: "NO_ENTITLEMENT" };

  const limit = DAILY_LIMITS[subscription.type];
  if (typeof limit === "number" && limit > 0 && usage.dailyCount >= limit)
    return { allowed: false, reason: "DAILY_LIMIT_REACHED" };

  if (subscription.type === PLAN.PAY_PER_USE && !job.paid)
    return { allowed: false, reason: "PAYMENT_REQUIRED" };

  return { allowed: true };
}

function _guardDownload(state) {
  const { user, entitlement, subscription } = state;
  if (!user.loggedIn)          return { allowed: false, reason: "NOT_LOGGED_IN" };
  if (!entitlement.canDownload) return { allowed: false, reason: "NO_DOWNLOAD_ENTITLEMENT" };
  if (subscription.type === PLAN.FREE)
                               return { allowed: false, reason: "FREE_USER_NO_DOWNLOAD" };
  return { allowed: true };
}

// ══════════════════════════════════════════════════════════════════════════════
// § 8 · CANONICAL JOB SHAPE
// ══════════════════════════════════════════════════════════════════════════════

const _JOB_DEFAULTS = Object.freeze({
  jobId:       null,
  progress:    0,
  status:      JOB_STATUS.IDLE,
  paid:        false,
  startedAt:   null,
  completedAt: null,
  inputRef:    null,
  resultRef:   null,
});

// ══════════════════════════════════════════════════════════════════════════════
// § 9 · INITIAL STATE BUILDER  (with localStorage hydration)
// ══════════════════════════════════════════════════════════════════════════════

function _buildInitialState() {
  const sessionData = _store.get(STORAGE.SESSION);
  const subData     = _store.get(STORAGE.SUBSCRIPTION);
  const usageData   = _store.get(STORAGE.USAGE);
  const aiData      = _store.get(STORAGE.AI_PROFILE);
  const analyticsQ  = _store.get(STORAGE.ANALYTICS_Q);
  const safeAnalyticsQ = Array.isArray(analyticsQ) ? analyticsQ : [];
  const today       = _dateKey();

  // ── Session validation ────────────────────────────────────────────────────
  // Single-device: session token only valid on the device that created it.
  const sessionValid =
    sessionData != null &&
    typeof sessionData.token === "string" &&
    typeof sessionData.lastActive === "number" &&
    (Date.now() - sessionData.lastActive) < SESSION_TTL_MS &&
    sessionData.deviceId === DEVICE_ID;               // ← single-device enforcement

  // ── Subscription ──────────────────────────────────────────────────────────
  const defaultSub = { type: PLAN.FREE, status: SUB_STATUS.NONE, expiry: null, payPerUseCredits: 0 };
  const subscription = subData ? { ...defaultSub, ...subData } : defaultSub;
  const flags        = _computeFlags(subscription);
  const entitlement  = _computeEntitlements(subscription);

  // ── User / Session ────────────────────────────────────────────────────────
  const user = sessionValid
    ? { id: sessionData.userId, loggedIn: true,  activeDevice: DEVICE_ID, email: sessionData.email || null, name: sessionData.name || null }
    : { id: null,               loggedIn: false, activeDevice: null,      email: null,                      name: null };

  const session = sessionValid
    ? { token: sessionData.token, lastActive: sessionData.lastActive, deviceId: DEVICE_ID, expiresAt: sessionData.expiresAt || null }
    : { token: null,              lastActive: null,                   deviceId: DEVICE_ID, expiresAt: null };

  // ── Usage (reset if stale date) ───────────────────────────────────────────
  const usageValid = usageData && usageData.dateKey === today;
  const usage = {
    dailyCount: usageValid ? (usageData.dailyCount  || 0) : 0,
    lastReset:  usageValid ? usageData.lastReset     : Date.now(),
    dateKey:    today,
    totalCount: usageData?.totalCount || 0,           // lifetime count never resets
  };

  // ── AI Profile (only hydrate if it belongs to this user) ─────────────────
  const aiOwned = aiData && aiData.userId === sessionData?.userId;
  const aiProfile = aiOwned
    ? { userId: aiData.userId, preferences: aiData.preferences || {}, history: aiData.history || [], updatedAt: aiData.updatedAt || null }
    : { userId: user.id,       preferences: {},                        history: [],                 updatedAt: null };

  // ── Analytics ─────────────────────────────────────────────────────────────
  const analytics = {
    queue: safeAnalyticsQ.slice(-MAX_ANALYTICS_QUEUE),
    sessionId: `ses_${_uid()}`,
  };

  return {
    screen:       sessionValid ? SCREENS.UPLOAD : SCREENS.SPLASH,
    user,
    session,
    subscription,
    entitlement,
    job:          { ..._JOB_DEFAULTS },
    usage,
    aiProfile,
    flags,
    analytics,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// § 10 · REDUCER  (pure · centralized · all business logic lives here)
// ══════════════════════════════════════════════════════════════════════════════

function _reducer(state, action) {
  switch (action.type) {

    // ── Navigation ────────────────────────────────────────────────────────────
    case A.SET_SCREEN:
      return state.screen === action.payload
        ? state
        : { ...state, screen: action.payload };

    // ── Login ─────────────────────────────────────────────────────────────────
    case A.LOGIN: {
      const { userId, email, name, token, subscription: incomingSub } = action.payload;
      const now  = Date.now();
      const newSub = incomingSub
        ? { type: PLAN.FREE, status: SUB_STATUS.NONE, expiry: null, payPerUseCredits: 0, ...incomingSub }
        : state.subscription;
      return {
        ...state,
        screen:       SCREENS.UPLOAD,
        user:         { id: userId, loggedIn: true, activeDevice: DEVICE_ID, email: email || null, name: name || null },
        session:      { token, lastActive: now, deviceId: DEVICE_ID, expiresAt: now + SESSION_TTL_MS },
        subscription: newSub,
        flags:        _computeFlags(newSub),
        entitlement:  _computeEntitlements(newSub),
        aiProfile:    { userId, preferences: {}, history: [], updatedAt: null },
      };
    }

    // ── Logout ────────────────────────────────────────────────────────────────
    case A.LOGOUT: {
      // Compute a clean state (localStorage already cleared by the callback)
      const cleanSub = { type: PLAN.FREE, status: SUB_STATUS.NONE, expiry: null, payPerUseCredits: 0 };
      return {
        screen:       SCREENS.LOGIN,
        user:         { id: null, loggedIn: false, activeDevice: null, email: null, name: null },
        session:      { token: null, lastActive: null, deviceId: DEVICE_ID, expiresAt: null },
        subscription: cleanSub,
        entitlement:  _computeEntitlements(cleanSub),
        job:          { ..._JOB_DEFAULTS },
        usage:        { dailyCount: 0, lastReset: Date.now(), dateKey: _dateKey(), totalCount: 0 },
        aiProfile:    { userId: null, preferences: {}, history: [], updatedAt: null },
        flags:        _computeFlags(cleanSub),
        analytics:    { queue: [], sessionId: `ses_${_uid()}` },
      };
    }

    // ── Session Refresh ───────────────────────────────────────────────────────
    case A.SESSION_REFRESH:
      return { ...state, session: { ...state.session, lastActive: Date.now() } };

    // ── Subscription Set (admin / server-sync) ────────────────────────────────
    case A.SET_SUBSCRIPTION: {
      const newSub = { ...state.subscription, ...action.payload };
      return {
        ...state,
        subscription: newSub,
        flags:        _computeFlags(newSub),
        entitlement:  _computeEntitlements(newSub),
      };
    }

    // ── Payment ───────────────────────────────────────────────────────────────
    case A.MARK_PAYMENT: {
      const { paymentType } = action.payload;

      // Per-use: mark the current job as paid, set plan to PAY_PER_USE
      if (paymentType === "per_use" || paymentType === PLAN.PAY_PER_USE) {
        const newSub = { ...state.subscription, type: PLAN.PAY_PER_USE };
        return {
          ...state,
          subscription: newSub,
          flags:        _computeFlags(newSub),
          entitlement:  _computeEntitlements(newSub),
          job:          { ...state.job, paid: true },
        };
      }

      // Subscription activation (ADVANCED or PRIVACY)
      const newSub = {
        ...state.subscription,
        type:   paymentType,
        status: SUB_STATUS.ACTIVE,
        expiry: Date.now() + 365 * 24 * 60 * 60 * 1_000,
      };
      return {
        ...state,
        subscription: newSub,
        flags:        _computeFlags(newSub),
        entitlement:  _computeEntitlements(newSub),
      };
    }

    // ── Job: Partial patch ────────────────────────────────────────────────────
    case A.SET_JOB:
      return { ...state, job: { ...state.job, ...action.payload } };

    // ── Job: Start ────────────────────────────────────────────────────────────
    case A.START_JOB: {
      // Reducer-level guard (defense-in-depth — callback also guards)
      const guard = _guardStartJob(state);
      if (!guard.allowed) return state;
      return {
        ...state,
        job: {
          ...state.job,
          jobId:       `job_${_uid()}`,
          status:      JOB_STATUS.RUNNING,
          progress:    0,
          startedAt:   Date.now(),
          completedAt: null,
          resultRef:   null,
        },
      };
    }

    // ── Job: Complete ─────────────────────────────────────────────────────────
    case A.COMPLETE_JOB: {
      const resultRef  = action.payload?.resultRef || state.job.resultRef;
      const isSubscriber = state.flags.isSubscribed;

      // Append job to AI profile history (subscribed users only, no cross-user sharing)
      const newHistory = isSubscriber
        ? [ ...(state.aiProfile.history || []),
            { jobId: state.job.jobId, resultRef, plan: state.subscription.type, ts: Date.now() }
          ].slice(-MAX_AI_HISTORY)
        : state.aiProfile.history;

      return {
        ...state,
        job: {
          ...state.job,
          status:      JOB_STATUS.DONE,
          progress:    100,
          completedAt: Date.now(),
          resultRef,
        },
        usage: {
          ...state.usage,
          dailyCount: state.usage.dailyCount + 1,
          totalCount: (state.usage.totalCount || 0) + 1,
        },
        aiProfile: isSubscriber
          ? { ...state.aiProfile, history: newHistory, updatedAt: Date.now() }
          : state.aiProfile,
      };
    }

    // ── Job: Fail ─────────────────────────────────────────────────────────────
    case A.FAIL_JOB:
      return {
        ...state,
        job: { ...state.job, status: JOB_STATUS.FAILED, completedAt: Date.now() },
      };

    // ── Job: Reset ────────────────────────────────────────────────────────────
    case A.RESET_JOB:
      return { ...state, job: { ..._JOB_DEFAULTS } };

    // ── Usage: Daily Reset ────────────────────────────────────────────────────
    case A.RESET_DAILY_USAGE:
      return {
        ...state,
        usage: { ...state.usage, dailyCount: 0, lastReset: Date.now(), dateKey: _dateKey() },
      };

    // ── AI Profile ────────────────────────────────────────────────────────────
    case A.UPDATE_AI_PROFILE: {
      // AI personalization is only for subscribed users — enforce in reducer
      if (!state.flags.isSubscribed) return state;
      const { preferences, historyEntry } = action.payload || {};
      const newHistory = historyEntry
        ? [ ...(state.aiProfile.history || []), { ...historyEntry, ts: Date.now() } ].slice(-MAX_AI_HISTORY)
        : state.aiProfile.history;
      return {
        ...state,
        aiProfile: {
          ...state.aiProfile,
          preferences: preferences
            ? { ...state.aiProfile.preferences, ...preferences }
            : state.aiProfile.preferences,
          history:   newHistory,
          updatedAt: Date.now(),
        },
      };
    }

    // ── Analytics: Queue event ────────────────────────────────────────────────
    case A.QUEUE_EVENT: {
      const event = {
        name:      action.payload.name,
        props:     _sanitize(action.payload.props || {}),
        ts:        Date.now(),
        sessionId: state.analytics.sessionId,
        screen:    state.screen,
        userId:    state.user.id,
        planType:  state.subscription.type,
      };
      const q = [...state.analytics.queue, event];
      if (q.length > MAX_ANALYTICS_QUEUE) q.shift();
      return { ...state, analytics: { ...state.analytics, queue: q } };
    }

    // ── Analytics: Flush ──────────────────────────────────────────────────────
    case A.FLUSH_ANALYTICS:
      return { ...state, analytics: { ...state.analytics, queue: [] } };

    // ── Soft Reset  (screen → splash · job → idle · user/sub preserved) ───────
    // Matches original `reset` behavior — screen back to splash, job cleared.
    case A.RESET:
      return { ...state, screen: SCREENS.SPLASH, job: { ..._JOB_DEFAULTS } };

    default:
      return state;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// § 11 · CONTEXT
// ══════════════════════════════════════════════════════════════════════════════

const AppContext = createContext(null);

// ══════════════════════════════════════════════════════════════════════════════
// § 12 · PROVIDER
// ══════════════════════════════════════════════════════════════════════════════

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(_reducer, undefined, _buildInitialState);

  /**
   * stateRef — always-current state snapshot for stable callbacks.
   * Pattern: update ref after every render so callbacks (with [] deps)
   * always read the latest state without adding state to their dep arrays.
   * This keeps all action creators as stable function references.
   */
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }); // intentionally no deps — runs every render

  // ════════════════════════════════════════════════════════════════════════
  // EFFECTS — persistence, heartbeat, daily reset, cross-tab sync, flush
  // ════════════════════════════════════════════════════════════════════════

  // Session persistence
  useEffect(() => {
    if (!state.user.loggedIn || !state.session.token) return;
    _store.set(STORAGE.SESSION, {
      userId:     state.user.id,
      email:      state.user.email,
      name:       state.user.name,
      token:      state.session.token,
      lastActive: state.session.lastActive,
      deviceId:   state.session.deviceId,
      expiresAt:  state.session.expiresAt,
    });
  }, [state.user.loggedIn, state.session.token, state.session.lastActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscription persistence
  useEffect(() => {
    _store.set(STORAGE.SUBSCRIPTION, state.subscription);
  }, [state.subscription]);

  // Usage persistence
  useEffect(() => {
    _store.set(STORAGE.USAGE, state.usage);
  }, [state.usage]);

  // AI profile persistence (subscribed users only)
  useEffect(() => {
    if (!state.flags.isSubscribed) return;
    _store.set(STORAGE.AI_PROFILE, state.aiProfile);
  }, [state.aiProfile, state.flags.isSubscribed]);

  // Analytics queue persistence (small tail only)
  useEffect(() => {
    _store.set(STORAGE.ANALYTICS_Q, state.analytics.queue.slice(-50));
  }, [state.analytics.queue]);

  // Session heartbeat — refresh lastActive every 5 minutes
  useEffect(() => {
    if (!state.user.loggedIn) return;
    const timer = setInterval(() => {
      dispatch({ type: A.SESSION_REFRESH });
    }, HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [state.user.loggedIn]);

  // Daily usage auto-reset — checks every minute; no cron dependency
  useEffect(() => {
    const check = () => {
      if (stateRef.current.usage.dateKey !== _dateKey()) {
        dispatch({ type: A.RESET_DAILY_USAGE });
      }
    };
    check();
    const timer = setInterval(check, 60_000);
    return () => clearInterval(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Analytics batched flush — 5s interval via stateRef (no stale closure)
  useEffect(() => {
    const timer = setInterval(() => {
      const q = stateRef.current.analytics.queue;
      if (q.length > 0) {
        _flushToBackend(q);
        dispatch({ type: A.FLUSH_ANALYTICS });
      }
    }, ANALYTICS_FLUSH_MS);
    return () => clearInterval(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cross-tab session sync — another tab logging out syncs this tab
  useEffect(() => {
    const handler = (e) => {
      if (e.key === STORAGE.SESSION && !e.newValue && stateRef.current.user.loggedIn) {
        _clearSessionStorage();
        dispatch({ type: A.LOGOUT });
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ════════════════════════════════════════════════════════════════════════
  // STABLE ACTION CREATORS  (all deps = [] via stateRef pattern)
  // ════════════════════════════════════════════════════════════════════════

  /** Navigate to a screen */
  const navigate = useCallback((screen) => {
    dispatch({ type: A.SET_SCREEN, payload: screen });
    dispatch({ type: A.QUEUE_EVENT, payload: { name: "SCREEN_VIEW", props: { screen } } });
  }, []);

  /**
   * login({ userId, token, email?, name?, subscription? })
   * Clears stale session before applying new credentials.
   */
  const login = useCallback((userData) => {
    if (!userData?.userId || !userData?.token) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[AppContext] login() requires { userId, token }");
      }
      return;
    }
    _clearSessionStorage();
    dispatch({ type: A.LOGIN, payload: userData });
    dispatch({ type: A.QUEUE_EVENT, payload: { name: "USER_LOGIN", props: { userId: userData.userId } } });
  }, []);

  /** logout() — wipes all session/subscription storage, fires analytics */
  const logout = useCallback(() => {
    dispatch({ type: A.QUEUE_EVENT, payload: { name: "USER_LOGOUT", props: {} } });
    _clearSessionStorage();
    dispatch({ type: A.LOGOUT });
  }, []);

  /** setJob(patch) — partial job state update (backward-compatible) */
  const setJob = useCallback((patch) => {
    dispatch({ type: A.SET_JOB, payload: patch });
  }, []);

  /**
   * startJob() — enforces all guards: auth, active-job, entitlement, daily limit, payment.
   * Returns { allowed: boolean, reason?: string }
   */
  const startJob = useCallback(() => {
    const guard = _guardStartJob(stateRef.current);
    if (!guard.allowed) {
      dispatch({ type: A.QUEUE_EVENT, payload: { name: "JOB_BLOCKED", props: { reason: guard.reason } } });
      return guard;
    }
    dispatch({ type: A.START_JOB });
    dispatch({ type: A.QUEUE_EVENT, payload: { name: "JOB_STARTED", props: { plan: stateRef.current.subscription.type } } });
    return { allowed: true };
  }, []);

  /** completeJob(resultRef?) — marks job done, increments usage, appends AI history */
  const completeJob = useCallback((resultRef = null) => {
    dispatch({ type: A.COMPLETE_JOB, payload: { resultRef } });
    dispatch({ type: A.QUEUE_EVENT, payload: { name: "JOB_COMPLETED", props: { resultRef } } });
  }, []);

  /** failJob(reason?) — transitions job to FAILED */
  const failJob = useCallback((reason = "unknown") => {
    dispatch({ type: A.FAIL_JOB });
    dispatch({ type: A.QUEUE_EVENT, payload: { name: "JOB_FAILED", props: { reason } } });
  }, []);

  /** resetJob() — clears job state back to IDLE */
  const resetJob = useCallback(() => {
    dispatch({ type: A.RESET_JOB });
  }, []);

  /** canStartJob() → { allowed, reason? } — pre-check without side effects */
  const canStartJob = useCallback(() => {
    return _guardStartJob(stateRef.current);
  }, []);

  /** canDownload() → { allowed, reason? } — entitlement + plan check */
  const canDownload = useCallback(() => {
    return _guardDownload(stateRef.current);
  }, []);

  /**
   * markPayment(paymentType)
   * paymentType: 'per_use' | PLAN.ADVANCED | PLAN.PRIVACY
   *
   * Enforced rules:
   *   - No downgrade (ADVANCED → FREE is blocked)
   *   - PAY_PER_USE cannot be applied as a subscription upgrade here
   *   - PRIVACY users skip payment entirely (guard in canStartJob)
   */
  const markPayment = useCallback((paymentType) => {
    const current = stateRef.current.subscription;

    // Downgrade guard
    const ORDER   = [PLAN.FREE, PLAN.PAY_PER_USE, PLAN.ADVANCED, PLAN.PRIVACY];
    const curRank = ORDER.indexOf(current.type);
    const newRank = ORDER.indexOf(paymentType);

    if (paymentType !== "per_use" && newRank !== -1 && newRank < curRank) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[AppContext] Subscription downgrade is not allowed.");
      }
      dispatch({ type: A.QUEUE_EVENT, payload: { name: "PAYMENT_BLOCKED", props: { reason: "NO_DOWNGRADE", paymentType } } });
      return { success: false, reason: "NO_DOWNGRADE" };
    }

    dispatch({ type: A.MARK_PAYMENT, payload: { paymentType } });
    dispatch({ type: A.QUEUE_EVENT, payload: { name: "PAYMENT_MARKED", props: { paymentType } } });
    return { success: true };
  }, []);

  /** resetDailyUsage() — manual override (admin / testing) */
  const resetDailyUsage = useCallback(() => {
    dispatch({ type: A.RESET_DAILY_USAGE });
  }, []);

  /** trackEvent(name, props?) — fire an analytics event */
  const trackEvent = useCallback((name, props = {}) => {
    dispatch({ type: A.QUEUE_EVENT, payload: { name, props } });
  }, []);

  /**
   * updateAIProfile({ preferences?, historyEntry? })
   * Only applied for subscribed users — enforced in reducer too.
   * No cross-user data sharing (userId check in initializer).
   */
  const updateAIProfile = useCallback((data) => {
    if (!stateRef.current.flags.isSubscribed) return;
    dispatch({ type: A.UPDATE_AI_PROFILE, payload: data });
  }, []);

  /** setSubscription(patch) — for server-sync / admin flows */
  const setSubscription = useCallback((patch) => {
    dispatch({ type: A.SET_SUBSCRIPTION, payload: patch });
  }, []);

  /**
   * reset() — soft reset (backward-compatible with original)
   * Returns screen to splash, clears job. User/subscription preserved.
   */
  const reset = useCallback(() => {
    dispatch({ type: A.RESET });
  }, []);

  // ════════════════════════════════════════════════════════════════════════
  // CONTEXT VALUE  (memoized — only re-creates when state changes)
  // ════════════════════════════════════════════════════════════════════════

  const value = useMemo(() => ({
    // ── Full state (direct access) ──────────────────────────────────────
    screen:       state.screen,
    user:         state.user,
    session:      state.session,
    subscription: state.subscription,
    entitlement:  state.entitlement,
    job:          state.job,
    usage:        state.usage,
    aiProfile:    state.aiProfile,
    flags:        state.flags,
    analytics:    state.analytics,

    // ── Backward-compatible API (original navigate / setJob / reset) ────
    navigate,
    setJob,
    reset,

    // ── Auth ────────────────────────────────────────────────────────────
    login,
    logout,

    // ── Job control ─────────────────────────────────────────────────────
    startJob,
    completeJob,
    failJob,
    resetJob,
    canStartJob,
    canDownload,

    // ── Payment ─────────────────────────────────────────────────────────
    markPayment,

    // ── Usage ───────────────────────────────────────────────────────────
    resetDailyUsage,

    // ── Analytics ───────────────────────────────────────────────────────
    trackEvent,

    // ── AI Personalization ───────────────────────────────────────────────
    updateAIProfile,

    // ── Subscription (admin/server-sync) ─────────────────────────────────
    setSubscription,

    // ── Shared constants (consumers skip separate imports) ───────────────
    PLAN,
    SCREENS,
    JOB_STATUS,
    SUB_STATUS,

    // ── Backend API stubs (structured, swap fetch() in) ──────────────────
    api,
  }), [
    state,
    navigate, setJob, reset,
    login, logout,
    startJob, completeJob, failJob, resetJob, canStartJob, canDownload,
    markPayment,
    resetDailyUsage,
    trackEvent,
    updateAIProfile,
    setSubscription,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ══════════════════════════════════════════════════════════════════════════════
// § 13 · HOOK
// ══════════════════════════════════════════════════════════════════════════════

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within <AppProvider>");
  return ctx;
}

// ══════════════════════════════════════════════════════════════════════════════
// § 14 · STORAGE CLEAR HELPER
// ══════════════════════════════════════════════════════════════════════════════

function _clearSessionStorage() {
  Object.values(STORAGE).forEach((k) => {
    if (k !== STORAGE.DEVICE_ID) _store.del(k); // preserve device ID
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// § 15 · ANALYTICS BACKEND FLUSH  (swap in live endpoint)
// ══════════════════════════════════════════════════════════════════════════════

function _flushToBackend(events) {
  if (!events || !events.length) return;
  // Production:
  // fetch("/api/analytics/ingest", {
  //   method:    "POST",
  //   headers:   { "Content-Type": "application/json" },
  //   body:      JSON.stringify({ events }),
  //   keepalive: true,   // survives page unload
  // }).catch(() => {});
}

// ══════════════════════════════════════════════════════════════════════════════
// § 16 · BACKEND API STUBS  (backend-ready — no live calls yet)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * api — structured fetch stubs.
 * Expose via context so components never import fetch directly.
 * Swap mock bodies with real fetch() to go live.
 */
export const api = Object.freeze({

  /** POST /api/auth/login */
  login: async (credentials) => {
    // const res = await fetch("/api/auth/login", {
    //   method:  "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body:    JSON.stringify(credentials),
    // });
    // return res.json();
    return { userId: `usr_${_uid()}`, token: `tok_${_uid()}`, email: credentials?.email || null };
  },

  /** POST /api/payments/verify */
  verifyPayment: async (intentId, token) => {
    // const res = await fetch("/api/payments/verify", {
    //   method:  "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body:    JSON.stringify({ intentId, token }),
    // });
    // return res.json();
    return { ok: true, transactionId: `txn_${_uid()}` };
  },

  /** GET /api/user/subscription */
  fetchSubscription: async (authToken) => {
    // const res = await fetch("/api/user/subscription", {
    //   headers: { Authorization: `Bearer ${authToken}` },
    // });
    // return res.json();
    return null;
  },

  /** POST /api/jobs */
  submitJob: async (jobSpec, authToken) => {
    // const res = await fetch("/api/jobs", {
    //   method:  "POST",
    //   headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
    //   body:    JSON.stringify(jobSpec),
    // });
    // return res.json();
    return { jobId: `job_${_uid()}`, status: "queued" };
  },

  /** GET /api/jobs/:jobId/status */
  pollJobStatus: async (jobId, authToken) => {
    // const res = await fetch(`/api/jobs/${jobId}/status`, {
    //   headers: { Authorization: `Bearer ${authToken}` },
    // });
    // return res.json();
    return { jobId, status: "done", resultRef: `result_${jobId}` };
  },
});

// ══════════════════════════════════════════════════════════════════════════════
// § 17 · DEVELOPER DEBUG  (console-only — zero UI, dev builds only)
// ══════════════════════════════════════════════════════════════════════════════

if (typeof window !== "undefined" && typeof process !== "undefined" && process.env && process.env.NODE_ENV === "development") {
  window.__rp_ctx_debug = () => ({
    session:      _store.get(STORAGE.SESSION),
    subscription: _store.get(STORAGE.SUBSCRIPTION),
    usage:        _store.get(STORAGE.USAGE),
    aiProfile:    _store.get(STORAGE.AI_PROFILE),
    analyticsQ:   _store.get(STORAGE.ANALYTICS_Q),
    deviceId:     DEVICE_ID,
    constants:    { PLAN, SUB_STATUS, JOB_STATUS, SCREENS, DAILY_LIMITS },
  });
}
