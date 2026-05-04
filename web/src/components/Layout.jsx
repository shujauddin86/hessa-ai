import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
    toast.success("Logged out");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/5 backdrop-blur bg-black/40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Hessa AI
          </Link>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white transition">
                  Dashboard
                </Link>
                <Link href="/subscription" className="text-sm text-zinc-400 hover:text-white transition">
                  Plans
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-sm text-zinc-400 hover:text-white transition"
                >
                  Logout
                </button>
                <span className="text-xs text-purple-400 bg-purple-900/30 px-2 py-1 rounded-full">
                  {user.name}
                </span>
              </>
            ) : (
              <>
                <Link href="/login"    className="text-sm text-zinc-400 hover:text-white transition">Login</Link>
                <Link href="/register" className="text-sm bg-purple-600 hover:bg-purple-500 transition px-3 py-1.5 rounded-lg">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
