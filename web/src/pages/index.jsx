import Link from "next/link";
import Layout from "../components/Layout";

export default function Home() {
  return (
    <Layout>
      <div className="text-center py-20">
        {/* Hero */}
        <div className="inline-block text-xs font-medium text-purple-300 bg-purple-900/30 border border-purple-500/30 px-3 py-1 rounded-full mb-6">
          AI-Powered Face Tracking Reels
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
          Your moments, <br />
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            perfectly captured
          </span>
        </h1>
        <p className="text-zinc-400 text-lg max-w-xl mx-auto mb-10">
          Upload any video. Hessa AI finds your face, selects the best moments,
          and creates a cinematic reel — automatically.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/register"
            className="px-8 py-3.5 bg-purple-600 hover:bg-purple-500 rounded-xl font-semibold transition-all text-lg"
          >
            Get Started Free
          </Link>
          <Link
            href="/subscription"
            className="px-8 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-semibold transition-all text-lg"
          >
            View Plans
          </Link>
        </div>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16">
        {[
          { icon: "🎯", title: "Face Tracking",   desc: ">90% confidence — finds you across every frame" },
          { icon: "✂️", title: "Smart Editing",   desc: "Beat-synced music, cinematic transitions, lighting correction" },
          { icon: "🔒", title: "Privacy First",   desc: "Auto-deleted after download. E2E encrypted. GDPR compliant." },
        ].map((f) => (
          <div key={f.title} className="glass rounded-2xl p-6">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="font-semibold mb-1">{f.title}</h3>
            <p className="text-zinc-400 text-sm">{f.desc}</p>
          </div>
        ))}
      </div>
    </Layout>
  );
}
