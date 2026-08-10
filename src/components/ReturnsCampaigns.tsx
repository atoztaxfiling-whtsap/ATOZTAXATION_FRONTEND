import { useState, useEffect } from "react";
import { startReturns, stopReturns } from "../services/api";
type CT = "monthly" | "quarterly";
function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
export default function ReturnsCampaigns() {
  const [loading, setLoading] = useState<Record<CT, boolean>>({ monthly: false, quarterly: false });
  const [status, setStatus] = useState<string | null>(null);
  useEffect(() => { if (!status) return; const t = setTimeout(() => setStatus(null), 4000); return () => clearTimeout(t); }, [status]);
  const start = async (t: CT) => { setLoading(p => ({ ...p, [t]: true })); try { const ok = await startReturns(t); setStatus(ok ? `Started ${cap(t)}` : `Failed ${t}`); } catch { setStatus(`Failed ${t}`); } finally { setLoading(p => ({ ...p, [t]: false })); } };
  const stop = async (t: CT) => { setLoading(p => ({ ...p, [t]: true })); try { const ok = await stopReturns(t); setStatus(ok ? `Stopped ${cap(t)}` : `Failed ${t}`); } catch { setStatus(`Failed ${t}`); } finally { setLoading(p => ({ ...p, [t]: false })); } };
  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      <h2 className="text-2xl font-bold">Returns Campaigns</h2>
      {status && <div className={`px-4 py-3 rounded text-sm font-medium ${status.startsWith('Started') || status.startsWith('Stopped') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{status}</div>}
      <div className="space-y-3">
        <div className="flex gap-3"><button onClick={() => start("monthly")} disabled={loading.monthly} className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-60">{loading.monthly ? "Starting..." : "Start Monthly"}</button><button onClick={() => stop("monthly")} disabled={loading.monthly} className="bg-red-600 text-white px-4 py-2 rounded disabled:opacity-60">{loading.monthly ? "Stopping..." : "Stop Monthly"}</button></div>
        <div className="flex gap-3"><button onClick={() => start("quarterly")} disabled={loading.quarterly} className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-60">{loading.quarterly ? "Starting..." : "Start Quarterly"}</button><button onClick={() => stop("quarterly")} disabled={loading.quarterly} className="bg-red-600 text-white px-4 py-2 rounded disabled:opacity-60">{loading.quarterly ? "Stopping..." : "Stop Quarterly"}</button></div>
      </div>
      <p className="text-sm text-slate-600">Campaigns run on clients in respective returns sheets.</p>
    </div>
  );
}
