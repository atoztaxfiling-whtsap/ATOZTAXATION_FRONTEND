/* ============================================================
   FollowupReview.tsx — HOLD queue review (pehle review, phir client ko)
   ============================================================
   Jab FOLLOWUP_HOLD=on hota hai, har followup pehle yahan 'pending' aata
   hai. Yahin se har message ko:
     - Approve     -> engine agle tick (10-15 min) pe send-window me bhej dega
     - Edit        -> apne shabd likho; "Save & send" se reviewer ka EXACT
                      text (verbatim) jayega, AI rewrite nahi
     - Disapprove  -> ye message nahi jayega
     - Delete      -> queue se poori tarah hata do
   Sab login ke peeche, CRM ke andar. Koi public link nahi.
   ============================================================ */
import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Check, X, Pencil, Trash2, Send, Clock } from "lucide-react";
import {
  fetchFollowupReview, approveHold, skipHold, editHold, deleteHold,
  type HoldItem,
} from "../../services/crmApi";
import { useCrm } from "../../services/crmStore";
import { PageHead, Panel, Btn, Pill, Avatar, Metric } from "./ui";

const KIND_LABEL: Record<string, string> = {
  payment: "Payment", returns: "GST return", docs: "Documents",
  registration: "Registration", installment: "Installment", general: "General",
};
function kindLabel(k?: string) { return KIND_LABEL[(k || "").toLowerCase()] || (k || "Followup"); }

function timeAgo(iso?: string | null): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "";
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return "abhi";
  const m = Math.floor(s / 60); if (m < 60) return `${m} min pehle`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} ghante pehle`;
  const d = Math.floor(h / 24); return `${d} din pehle`;
}

export default function FollowupReview() {
  const { toast } = useCrm();
  const [data, setData] = useState<{ hold_on: boolean; pending: HoldItem[]; recent: HoldItem[] }>({
    hold_on: false, pending: [], recent: [],
  });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<string>("");          // id jiska action chal raha
  const [editId, setEditId] = useState<string>("");       // konsa card edit mode me
  const [draftTxt, setDraftTxt] = useState<string>("");
  const [confirmDel, setConfirmDel] = useState<string>(""); // delete confirm inline

  const load = useCallback(async () => {
    try { setErr(""); setData(await fetchFollowupReview()); }
    catch (e) { if ((e as Error).message !== "UNAUTHORIZED") setErr((e as Error).message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  // har 60s auto-refresh (queue live dikhe)
  useEffect(() => { const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);

  async function act(id: string, fn: () => Promise<unknown>, msg: string) {
    setBusy(id);
    try { await fn(); toast(msg); await load(); }
    catch (e) { toast("Nahi hua: " + (e as Error).message); }
    finally { setBusy(""); setConfirmDel(""); }
  }

  function startEdit(it: HoldItem) { setEditId(it.id); setDraftTxt(it.draft || ""); }
  function cancelEdit() { setEditId(""); setDraftTxt(""); }

  const pending = data.pending || [];
  const recent = data.recent || [];
  const approvedN = recent.filter(r => r.status === "approved").length;
  const skippedN = recent.filter(r => r.status === "skipped").length;

  return (
    <div className="h-full overflow-y-auto bg-[#F6F5F1] p-4 sm:p-6">
      <PageHead
        title="Followup review"
        sub="Har message pehle yahan — approve karo, edit karo, ya rok do. Tabhi client ko jayega."
        actions={
          <>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold ${data.hold_on ? "bg-[#E1F5EE] text-[#04342C]" : "bg-[#FCEBEB] text-[#A32D2D]"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${data.hold_on ? "bg-[#0F6E56]" : "bg-[#A32D2D]"}`} />
              HOLD {data.hold_on ? "ON" : "OFF"}
            </span>
            <Btn size="sm" onClick={load}><RefreshCw className="w-3.5 h-3.5" />Refresh</Btn>
          </>
        }
      />

      {!data.hold_on && (
        <div className="mb-4 rounded-xl border border-[#F0D9A8] bg-[#FDF6E9] px-4 py-3 text-[12.5px] text-[#6B5212]">
          HOLD abhi <b>OFF</b> hai — followups review ke bina seedhe client ko ja rahe hain.
          Review on karna ho to Render me <code className="font-mono">FOLLOWUP_HOLD=on</code> set karein.
          (Niche pending tab bhi dikhega jab tak queue me kuch bacha ho.)
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-5 max-w-xl">
        <Metric label="Pending" value={pending.length} tone={pending.length ? "warn" : undefined} />
        <Metric label="Approve (recent)" value={approvedN} tone="good" />
        <Metric label="Rok diye (recent)" value={skippedN} />
      </div>

      {err && (
        <div className="mb-4 rounded-xl border border-[#F3C9C9] bg-[#FCEBEB] px-4 py-3 text-[12.5px] text-[#A32D2D]">
          {err}
        </div>
      )}

      {loading ? (
        <div className="text-[#9BA098] text-[13px] py-10 text-center">Load ho raha…</div>
      ) : (
        <>
          <div className="mb-3 text-[13px] font-semibold text-[#1C1E1B]">Pending ({pending.length})</div>
          {pending.length === 0 ? (
            <Panel><div className="px-4 py-8 text-center text-[#9BA098] text-[13px]">
              Abhi review ke liye kuch nahi — sab clear hai. 🎉
            </div></Panel>
          ) : (
            <div className="grid gap-3">
              {pending.map(it => {
                const editing = editId === it.id;
                const isBusy = busy === it.id;
                return (
                  <div key={it.id} className="bg-white border border-[#E6E4DD] rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <Avatar name={it.name || it.mobile} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-[13.5px] text-[#1C1E1B] truncate">{it.name || "—"}</span>
                          <span className="text-[12px] text-[#6B6F68] font-mono">{it.mobile}</span>
                          <Pill status={kindLabel(it.kind)} />
                          {it.edited && <span className="text-[10.5px] text-[#BA7517] bg-[#FDF6E9] px-1.5 py-0.5 rounded-md font-semibold">edited</span>}
                        </div>
                        {it.note && <div className="text-[11.5px] text-[#9BA098] mt-0.5">{it.note}</div>}
                      </div>
                      <span className="text-[11px] text-[#9BA098] flex items-center gap-1 flex-shrink-0">
                        <Clock className="w-3 h-3" />{timeAgo(it.created_at)}
                      </span>
                    </div>

                    {editing ? (
                      <div className="mt-3">
                        <textarea
                          value={draftTxt} onChange={e => setDraftTxt(e.target.value)} rows={4}
                          className="w-full px-3 py-2 border border-[#E6E4DD] rounded-lg text-[13px] outline-none focus:border-[#0F6E56] bg-white resize-y"
                          placeholder="Message likho jo client ko jayega…" />
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <Btn size="sm" variant="primary" disabled={isBusy || !draftTxt.trim()}
                            onClick={() => act(it.id, () => editHold(it.id, draftTxt.trim(), true), "Edit karke approve — ye exact text jayega")}>
                            <Send className="w-3.5 h-3.5" />Save &amp; send
                          </Btn>
                          <Btn size="sm" disabled={isBusy || !draftTxt.trim()}
                            onClick={() => act(it.id, () => editHold(it.id, draftTxt.trim(), false), "Edit save ho gaya (abhi approve nahi)")}>
                            Save only
                          </Btn>
                          <Btn size="sm" onClick={cancelEdit}>Cancel</Btn>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 text-[13px] text-[#2B2F2A] bg-[#FBFAF7] border border-[#EFEEE8] rounded-lg px-3 py-2.5 whitespace-pre-wrap">
                        {it.draft || <span className="text-[#9BA098]">(message abhi tak nahi bana)</span>}
                      </div>
                    )}

                    {!editing && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        <Btn size="sm" variant="primary" disabled={isBusy}
                          onClick={() => act(it.id, () => approveHold(it.id), "Approve — agle cycle me chala jayega")}>
                          <Check className="w-3.5 h-3.5" />Approve
                        </Btn>
                        <Btn size="sm" disabled={isBusy} onClick={() => startEdit(it)}>
                          <Pencil className="w-3.5 h-3.5" />Edit
                        </Btn>
                        <Btn size="sm" variant="danger" disabled={isBusy}
                          onClick={() => act(it.id, () => skipHold(it.id), "Rok diya — ye nahi jayega")}>
                          <X className="w-3.5 h-3.5" />Disapprove
                        </Btn>
                        {confirmDel === it.id ? (
                          <span className="inline-flex items-center gap-1.5 text-[12px] text-[#A32D2D]">
                            Pakka delete?
                            <Btn size="sm" variant="danger" disabled={isBusy}
                              onClick={() => act(it.id, () => deleteHold(it.id), "Delete ho gaya")}>Haan</Btn>
                            <Btn size="sm" onClick={() => setConfirmDel("")}>Nahi</Btn>
                          </span>
                        ) : (
                          <Btn size="sm" disabled={isBusy} onClick={() => setConfirmDel(it.id)}>
                            <Trash2 className="w-3.5 h-3.5" />Delete
                          </Btn>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {recent.length > 0 && (
            <>
              <div className="mt-7 mb-3 text-[13px] font-semibold text-[#1C1E1B]">Recent faisle</div>
              <Panel>
                <div className="divide-y divide-[#EFEEE8]">
                  {recent.map(r => (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.status === "approved" ? "bg-[#0F6E56]" : "bg-[#A32D2D]"}`} />
                      <span className="font-semibold text-[12.5px] text-[#1C1E1B] truncate max-w-[130px]">{r.name || r.mobile}</span>
                      <Pill status={kindLabel(r.kind)} />
                      <span className="text-[12px] text-[#6B6F68] truncate flex-1 hidden sm:block">{r.draft}</span>
                      <span className={`text-[11.5px] font-semibold ${r.status === "approved" ? "text-[#0F6E56]" : "text-[#A32D2D]"}`}>
                        {r.status === "approved" ? "sent/approved" : "roka"}
                      </span>
                      <span className="text-[11px] text-[#9BA098] flex-shrink-0">{timeAgo(r.updated_at)}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            </>
          )}
        </>
      )}
      <div className="h-10" />
    </div>
  );
}
