import { useState } from "react";
import { setToken } from "../services/api";
import { staffLogin } from "../services/crmApi";
import { Lock, ArrowRight, User } from "lucide-react";

/* Do tarah ka login:
   - staff : username + password (har staff ka apna — audit me kaun edit kiya pata chale)
   - token : purana console-token (owner/fallback) */
export default function TokenLogin({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = useState<"staff" | "token">("staff");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setVal] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loginStaff() {
    if (!username.trim() || !password) { setError("Username aur password daalo"); return; }
    setLoading(true); setError("");
    try {
      await staffLogin(username.trim(), password);
      onSuccess();
    } catch (e) { setError((e as Error).message || "Login fail"); } finally { setLoading(false); }
  }

  async function loginToken() {
    if (!token.trim()) { setError("Token daalo pehle"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/chat/api/threads`, { headers: { "X-Console-Token": token.trim() } });
      if (res.status === 403) { setError("Token galat hai"); setLoading(false); return; }
      if (!res.ok) { setError("Server se connect nahi ho raha"); setLoading(false); return; }
      setToken(token.trim());
      try { localStorage.removeItem("actor_token"); localStorage.setItem("staff_name", "Admin"); } catch { /* noop */ }
      onSuccess();
    } catch { setError("Network error"); } finally { setLoading(false); }
  }

  const submit = () => (mode === "staff" ? loginStaff() : loginToken());

  return (
    <div className="h-screen w-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0E7A52, #0B5E40)" }}>
      <div className="w-full max-w-sm mx-4 rounded-2xl shadow-2xl p-8" style={{ background: "#fff" }}>
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#E4F2EC" }}>
            {mode === "staff" ? <User size={28} style={{ color: "#0E7A52" }} /> : <Lock size={28} style={{ color: "#0E7A52" }} />}
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center mb-1" style={{ color: "#15191E" }}>ATOZ Taxation</h1>
        <p className="text-sm text-center mb-6" style={{ color: "#5A6168" }}>
          {mode === "staff" ? "Apne username aur password se login" : "Console access token daalo"}
        </p>

        {mode === "staff" ? (
          <>
            <input value={username} onChange={e => { setUsername(e.target.value); setError(""); }} autoFocus
              onKeyDown={e => e.key === "Enter" && submit()} placeholder="Username" disabled={loading}
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none mb-3"
              style={{ background: "#F5F7F6", border: "2px solid transparent", color: "#15191E" }} />
            <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && submit()} placeholder="Password" disabled={loading}
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none mb-3"
              style={{ background: "#F5F7F6", border: error ? "2px solid #e53e3e" : "2px solid transparent", color: "#15191E" }} />
          </>
        ) : (
          <input type="password" value={token} onChange={e => { setVal(e.target.value); setError(""); }} autoFocus
            onKeyDown={e => e.key === "Enter" && submit()} placeholder="Console token enter karo" disabled={loading}
            className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none mb-3"
            style={{ background: "#F5F7F6", border: error ? "2px solid #e53e3e" : "2px solid transparent", color: "#15191E" }} />
        )}

        {error && <p className="text-xs mb-3 px-1" style={{ color: "#e53e3e" }}>{error}</p>}
        <button onClick={submit} disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm transition hover:opacity-90 disabled:opacity-50"
          style={{ background: "#0E7A52" }}>
          {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Login <ArrowRight size={16} /></>}
        </button>

        <p className="text-xs text-center mt-4" style={{ color: "#5A6168" }}>
          {mode === "staff"
            ? <button onClick={() => { setMode("token"); setError(""); }} className="underline">Admin token se login</button>
            : <button onClick={() => { setMode("staff"); setError(""); }} className="underline">Staff login (username/password)</button>}
        </p>
      </div>
    </div>
  );
}
