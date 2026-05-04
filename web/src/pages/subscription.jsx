import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { subAPI } from "../utils/api";

const PLANS = [
  {
    id:       "PAY_PER_USE",
    name:     "Pay Per Use",
    price:    "₹99",
    period:   "/ reel",
    features: [
      "Pay only for what you create",
      "1080p output",
      "No watermark",
      "Beat-synced music",
      "Cinematic LUT grading",
      "AWS-powered face detection",
    ],
    cta:       "Select Plan",
    highlight: false,
  },
  {
    id:       "ADVANCED",
    name:     "Advanced",
    price:    "₹299",
    period:   "/ month",
    features: [
      "3 reels per day",
      "1080p output",
      "No watermark",
      "Priority processing queue",
      "Beat-synced music",
      "Cinematic LUT grading",
      "Two-pass motion stabilization",
      "AWS-powered face detection",
    ],
    cta:       "Subscribe",
    highlight: true,
  },
  {
    id:       "PRIVACY",
    name:     "Privacy",
    price:    "₹199",
    period:   "/ month",
    features: [
      "Unlimited face analysis",
      "No reel output (analysis only)",
      "Platform violation detection",
      "Takedown request generator",
      "YouTube / Instagram / TikTok rules",
      "100% private — zero storage",
    ],
    cta:       "Subscribe",
    highlight: false,
  },
];

export default function Subscription() {
  const { user } = useAuth();
  const router   = useRouter();
  const [sub,     setSub]     = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    subAPI.get().then((r) => setSub(r.data.subscription)).catch(() => {});
  }, [user]);

  const handleSelect = async (plan) => {
    if (plan.id === sub?.plan) return;
    setLoading(true);
    try {
      const initRes = await subAPI.pay({ plan: plan.id });
      const intent  = initRes.data;

      // Simulate payment gateway (replace with Razorpay modal in production)
      toast.loading("Processing payment…", { id: "pay" });
      await new Promise((r) => setTimeout(r, 1500));

      await subAPI.confirm({
        plan:      plan.id,
        paymentId: intent.paymentIntentId,
        amount:    intent.amount,
      });

      setSub({ ...sub, plan: plan.id, status: "active" });
      toast.success(`Now on ${plan.name}!`, { id: "pay" });
    } catch (err) {
      toast.error(err?.error || "Payment failed", { id: "pay" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-3">Choose your plan</h1>
        <p className="text-zinc-400">
          {sub?.plan ? `Current plan: ${sub.plan}` : "Select a plan to get started"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {PLANS.map((plan) => {
          const isCurrent  = sub?.plan === plan.id;
          const isHighlight = plan.highlight;

          return (
            <div
              key={plan.id}
              className={`
                rounded-2xl p-6 flex flex-col border transition-all
                ${isHighlight ? "border-purple-500 bg-purple-900/10" : "border-zinc-700/50 glass"}
                ${isCurrent   ? "ring-2 ring-purple-500/50" : ""}
              `}
            >
              {isHighlight && (
                <span className="text-xs font-semibold text-purple-300 bg-purple-900/40 px-2 py-0.5 rounded-full self-start mb-3">
                  Most Popular
                </span>
              )}

              <h2 className="text-lg font-bold mb-1">{plan.name}</h2>
              <div className="mb-5">
                <span className="text-3xl font-extrabold">{plan.price}</span>
                <span className="text-zinc-500 text-sm">{plan.period}</span>
              </div>

              <ul className="flex-1 space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                    <span className="text-green-400 mt-0.5 shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelect(plan)}
                disabled={isCurrent || loading}
                className={`
                  w-full py-2.5 rounded-xl text-sm font-semibold transition-all
                  ${isCurrent
                    ? "bg-zinc-700 text-zinc-400 cursor-default"
                    : isHighlight
                    ? "bg-purple-600 hover:bg-purple-500"
                    : "bg-zinc-700 hover:bg-zinc-600"
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {isCurrent ? "✓ Current Plan" : loading ? "Processing…" : plan.cta}
              </button>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
