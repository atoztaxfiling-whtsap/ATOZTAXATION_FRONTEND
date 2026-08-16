/* ============================================================
   ChatSummaryBar — chat ke upar client ka 3-4 line ka nichod
   ============================================================
   Dikkat ye thi ki 10 purane message padho to zyada tar "theek hai",
   "ok ji" jaisa hi milta hai — asli baat kahin beech me dabi rehti
   hai. Ab upar hi dikh jayega ki is client ka chal kya raha hai.

   Summary bot khud banata rehta hai (har ~15 naye message pe, saste
   model se). Yahan bas dikhta hai. Turant taaza chahiye to refresh
   ka button hai.
   ============================================================ */
import { useEffect, useState } from "react";
import { Sparkles, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { fetchChatSummary, refreshChatSummary, type ChatSummary } from "../services/crmApi";

export default function ChatSummaryBar({ mobile }: { mobile: string }) {
  const [data, setData] = useState<ChatSummary | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    let alive = true;
    setData(null); setOpen(false); setGone(false);
    if (!mobile) return;
    fetchChatSummary(mobile)
      .then(d => { if (alive) setData(d || {}); })
      .catch(() => { if (alive) setGone(true); });
    return () => { alive = false; };
  }, [mobile]);

  async function refresh() {
    setBusy(true);
    try { setData(await refreshChatSummary(mobile)); setOpen(true); }
    catch { /* chup-chaap — chat chalti rahe */ }
    finally { setBusy(false); }
  }

  if (gone) return null;

  const text = (data?.summary || "").trim();
  const lines = text ? text.split("\n").filter(Boolean) : [];
  const first = lines[0] || "";

  return (
    <div className="flex-shrink-0" style={{ background: "#F4F6F2", borderBottom: "1px solid #E6E7E2" }}>
      <div className="flex items-start gap-2 px-4 py-2">
        <Sparkles size={14} style={{ color: "#0F6E56", marginTop: 2 }} className="flex-shrink-0" />

        <div className="flex-1 min-w-0">
          {!text ? (
            <p className="text-xs" style={{ color: "#8A9089" }}>
              Abhi is client ka summary nahi bana — kuch aur baat-cheet hone do,
              ya refresh dabao.
            </p>
          ) : open ? (
            <div className="text-xs leading-relaxed" style={{ color: "#3A4038" }}>
              {lines.map((l, i) => <p key={i}>{l}</p>)}
              {data?.updated_at && (
                <p className="mt-1" style={{ color: "#9BA098", fontSize: 10.5 }}>
                  {data.msgs_covered ? `${data.msgs_covered} message tak ka · ` : ""}
                  {new Date(data.updated_at).toLocaleString("en-IN",
                    { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs truncate" style={{ color: "#3A4038" }}>{first}</p>
          )}
        </div>

        <button onClick={refresh} disabled={busy} title="Summary abhi update karo"
          className="p-1 rounded hover:bg-black/5 disabled:opacity-40 flex-shrink-0">
          <RefreshCw size={13} style={{ color: "#5A6168" }} className={busy ? "animate-spin" : ""} />
        </button>

        {lines.length > 1 && (
          <button onClick={() => setOpen(v => !v)} className="p-1 rounded hover:bg-black/5 flex-shrink-0">
            {open ? <ChevronUp size={14} style={{ color: "#5A6168" }} />
                  : <ChevronDown size={14} style={{ color: "#5A6168" }} />}
          </button>
        )}
      </div>
    </div>
  );
}
