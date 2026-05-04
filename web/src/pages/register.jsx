import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import toast from "react-hot-toast";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm]       = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) { toast.error("Password must be 8+ characters"); return; }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success("Account created!");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-sm mx-auto mt-16">
        <h1 className="text-2xl font-bold mb-2 text-center">Create your account</h1>
        <p className="text-zinc-500 text-sm text-center mb-8">Start free — no credit card required</p>

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 flex flex-col gap-4">
          {[
            { key: "name",     type: "text",     label: "Name",     placeholder: "Your name" },
            { key: "email",    type: "email",    label: "Email",    placeholder: "you@example.com" },
            { key: "password", type: "password", label: "Password", placeholder: "Min 8 characters" },
          ].map(({ key, type, label, placeholder }) => (
            <div key={key}>
              <label className="text-sm text-zinc-400 mb-1 block">{label}</label>
              <input
                type={type}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500"
                placeholder={placeholder}
                required
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-xl font-semibold transition-all mt-2"
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="text-center text-zinc-500 text-sm mt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-purple-400 hover:text-purple-300">Sign in</Link>
        </p>
      </div>
    </Layout>
  );
}
