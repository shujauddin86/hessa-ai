import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import toast from "react-hot-toast";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const router    = useRouter();
  const [form, setForm]     = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-sm mx-auto mt-16">
        <h1 className="text-2xl font-bold mb-8 text-center">Sign in to Hessa</h1>

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 flex flex-col gap-4">
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-xl font-semibold transition-all mt-2"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-center text-zinc-500 text-sm mt-4">
          No account?{" "}
          <Link href="/register" className="text-purple-400 hover:text-purple-300">
            Create one
          </Link>
        </p>
      </div>
    </Layout>
  );
}
