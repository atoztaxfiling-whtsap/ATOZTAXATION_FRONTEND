import { useState } from "react";
import { setToken } from "../services/api";
import { Lock, ArrowRight } from "lucide-react";

export default function TokenLogin({ onSuccess }: { onSuccess: () => void }) {
  const [token, setVal] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!token.trim()) { setError("Token daalo pehle"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/chat/api/threads`, { headers: { "X-Console-Token": token.trim() } });
      if (res.status === 403) { setError("Token galat hai"); setLoading(false); return; }
      if (!res.ok) { setError("Server se connect nahi ho raha"); setLoading(false); return; }
      setToken(token.trim()); onSuccess();
    } catch { setError("Network error"); } finally { setLoading(false); }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #127A56, #0C5C40)" }}>
      <div className="w-full max-w-sm mx-4 rounded-2xl shadow-2xl p-8" style={{ background: "#fff" }}>
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#E7F2EC" }}>
            <Lock size={28} style={{ color: "#127A56" }} />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center mb-1" style={{ color: "#15191E" }}>ATOZ Taxation</h1>
        <p className="text-sm text-center mb-6" style={{ color: "#5A6168" }}>Console access token daalo</p>
        <input type="password" value={token} onChange={e => { setVal(e.target.value); setError(""); }}
          onKeyDown={e => e.key === "Enter" && handleSubmit()} placeholder="Console token enter karo" disabled={loading} autoFocus
          className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none mb-3"
          style={{ background: "#F2F5F1", border: error ? "2px solid #e53e3e" : "2px solid transparent", color: "#15191E" }} />
        {error && <p className="text-xs mb-3 px-1" style={{ color: "#e53e3e" }}>{error}</p>}
        <button onClick={handleSubmit} disabled={loading || !token.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm transition hover:opacity-90 disabled:opacity-50"
          style={{ background: "#127A56" }}>
          {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Login <ArrowRight size={16} /></>}
        </button>
        <p className="text-xs text-center mt-4" style={{ color: "#5A6168" }}>Token apne admin se maango</p>
      </div>
    </div>
  );
}
