import "../styles/globals.css";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "../context/AuthContext";

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#18181b",
            color:      "#f4f4f5",
            border:     "1px solid rgba(255,255,255,0.08)",
          },
        }}
      />
    </AuthProvider>
  );
}
