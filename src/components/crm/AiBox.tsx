/* ============================================================
   AiBox.tsx — AI command box
   ============================================================
   Ek line likho, kaam ho jaata hai.

   Niyam (screen pe bhi dikhte hain, code me bhi):
   - Client ko message bhejne wala koi bhi kaam BINA "Bhejo" dabaye
     nahi hoga. Ek client ho ya sau.
   - Ek se zyada record badal rahe hon to pehle poori list dikhegi.
   - Ek record ka chhota kaam seedha ho jaata hai — par UNDO rehta hai.
   ============================================================ */
import { useEffect, useRef, useState } from "react";
import {
  Sparkles, Send, X, Check, AlertTriangle, Undo2, Loader2, MessageSquare, Clock,
} from "lucide-react";
import {
  aiPlan, aiRun, aiCancel, aiUndo,
  type AiResult, type AiRunResult, type AiRead, type AiPlanItem,
} from "../../services/crmApi";
import { useCrm } from "../../services/crmStore";
import { Btn } from "./ui";

type Entry =
  | { kind: "you"; text: string }
  | { kind: "res"; res: AiResult }
  | { kind: "ran"; run: AiRunResult }
  | { kind: "err"; text: string };

const SUGGESTIONS = [
  "kis kis ka payment baaki hai",
  "is mahine kitna collection hua",
  "sab defaulter dikhao",
  "Ankit ka nil rate 800 kardo",
  "aaj ke followups",
];

export default function AiBox({ onClose }: { onClose: () => void }) {
  const { reload, toast } = useCrm();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<string | null>(null);   // confirm ka intezaar
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [entries, busy]);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 150); }, []);

  function push(e: Entry) { setEntries(p => [...p, e]); }

  async function ask(cmd?: string) {
    const t = (cmd ?? text).trim();
    if (!t || busy) return;
    setText("");
    push({ kind: "you", text: t });
    setBusy(true);
    try {
      const res = await aiPlan(t);
      if (!res.ok) { push({ kind: "err", text: res.error || "Kuch gadbad hui" }); }
      else {
        push({ kind: "res", res });
        if (res.kind === "confirm" && res.id) setPending(res.id);
        if (res.kind === "done") await reload();
      }
    } catch (e) {
      push({ kind: "err", text: (e as Error).message });
    } finally { setBusy(false); }
  }

  async function confirm(id: string, onlyOpen: boolean) {
    setBusy(true); setPending(null);
    try {
      const run = await aiRun(id, onlyOpen);
      push({ kind: "ran", run });
      await reload();
    } catch (e) { push({ kind: "err", text: (e as Error).message }); }
    finally { setBusy(false); }
  }

  async function cancel(id: string) {
    setPending(null);
    try { await aiCancel(id); } catch { /* koi baat nahi */ }
    push({ kind: "err", text: "Theek hai, kuch nahi kiya." });
  }

  async function undo(id: string) {
    setBusy(true);
    try {
      const r = await aiUndo(id);
      toast(`${r.reverted} change wapas kar diya`);
      await reload();
    } catch (e) { toast((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[80] bg-[rgba(20,22,18,.5)] flex items-end sm:items-center justify-center sm:p-5"
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="bg-[#F6F5F1] w-full sm:max-w-2xl h-[92vh] sm:h-[86vh] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden">

        {/* ---- top ---- */}
        <div className="flex items-center gap-2.5 px-4 py-3 bg-white border-b border-[#E6E4DD] flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#E1F5EE] text-[#0F6E56] flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[14.5px] leading-tight">AI command box</div>
            <div className="text-[11.5px] text-[#6B6F68]">Hinglish me likho — CRM ka kaam ho jayega</div>
          </div>
          <button onClick={onClose} className="text-[#9BA098] hover:text-[#1C1E1B] p-1"><X className="w-5 h-5" /></button>
        </div>

        {/* ---- baat-cheet ---- */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {entries.length === 0 && (
            <div className="pt-4">
              <div className="text-[13px] text-[#6B6F68] mb-3">Aise likh sakte ho:</div>
              <div className="flex flex-col gap-2">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => ask(s)}
                    className="text-left bg-white border border-[#E6E4DD] rounded-xl px-3.5 py-2.5 text-[13px] hover:border-[#0F6E56] active:bg-[#FBFAF7]">
                    {s}
                  </button>
                ))}
              </div>
              <div className="mt-5 bg-[#FFF6E8] border border-[#F2DFBE] rounded-xl px-3.5 py-3 text-[12px] text-[#7A5312] leading-relaxed">
                <b>Yaad rahe:</b> client ko message tab tak nahi jaata jab tak tum
                khud list dekh ke "Bhejo" na dabao. AI apne se kisi ko message
                nahi karta.
              </div>
            </div>
          )}

          {entries.map((e, i) => <EntryView key={i} e={e} onConfirm={confirm} onCancel={cancel} onUndo={undo} />)}

          {busy && (
            <div className="flex items-center gap-2 text-[13px] text-[#6B6F68]">
              <Loader2 className="w-4 h-4 animate-spin" /> Soch raha hoon…
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* ---- likhne ki jagah ---- */}
        <div className="border-t border-[#E6E4DD] bg-white px-3 py-2.5 flex items-end gap-2 flex-shrink-0 pb-[max(env(safe-area-inset-bottom),10px)]">
          <textarea
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }}
            rows={1}
            placeholder={pending ? "Upar confirm karo ya rehne do…" : "Likho… jaise: Zareena ka status completed"}
            disabled={!!pending}
            className="flex-1 resize-none max-h-28 px-3 py-2.5 border border-[#E6E4DD] rounded-xl text-[14px] outline-none focus:border-[#0F6E56] disabled:bg-[#F6F5F1]"
          />
          <button onClick={() => ask()} disabled={busy || !text.trim() || !!pending}
            className="w-10 h-10 rounded-xl bg-[#0F6E56] text-white flex items-center justify-center disabled:opacity-40 flex-shrink-0">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================ */

function EntryView({ e, onConfirm, onCancel, onUndo }: {
  e: Entry;
  onConfirm: (id: string, onlyOpen: boolean) => void;
  onCancel: (id: string) => void;
  onUndo: (id: string) => void;
}) {
  if (e.kind === "you") {
    return (
      <div className="flex justify-end">
        <div className="bg-[#1C1E1B] text-white rounded-2xl rounded-br-md px-3.5 py-2 text-[13.5px] max-w-[85%]">{e.text}</div>
      </div>
    );
  }

  if (e.kind === "err") {
    return <Card tone="warn"><div className="text-[13px]">{e.text}</div></Card>;
  }

  if (e.kind === "ran") {
    return <RanView run={e.run} onUndo={onUndo} />;
  }

  const r = e.res;

  if (r.kind === "question") {
    return (
      <Card>
        {r.reply && <div className="text-[13px] mb-1.5">{r.reply}</div>}
        <div className="text-[13.5px] font-medium">{r.question}</div>
        <Problems list={r.problems} />
      </Card>
    );
  }

  if (r.kind === "answer") {
    return (
      <Card>
        {(r.reads || []).map((rd, i) => <ReadView key={i} rd={rd} />)}
        <Problems list={r.problems} />
      </Card>
    );
  }

  if (r.kind === "done") {
    return (
      <Card tone="good">
        <div className="flex items-center gap-1.5 text-[13.5px] font-medium text-[#0F6E56] mb-2">
          <Check className="w-4 h-4" /> Ho gaya
        </div>
        {(r.done || []).map((d, i) => (
          <div key={i} className="text-[13px] mb-1">
            <span className="font-medium">{d.label}</span>
            <span className="text-[#6B6F68]"> — {d.what}</span>
          </div>
        ))}
        {(r.failed || []).map((f, i) => (
          <div key={i} className="text-[12.5px] text-[#A32D2D] mt-1">{f.label} — {f.why}</div>
        ))}
        {(r.reads || []).map((rd, i) => <ReadView key={i} rd={rd} />)}
        {r.can_undo && r.id && (
          <button onClick={() => onUndo(r.id!)}
            className="mt-2.5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#185FA5]">
            <Undo2 className="w-3.5 h-3.5" /> Wapas karo
          </button>
        )}
      </Card>
    );
  }

  /* ---- confirm ---- */
  return <ConfirmView res={r} onConfirm={onConfirm} onCancel={onCancel} />;
}

function ConfirmView({ res, onConfirm, onCancel }: {
  res: AiResult;
  onConfirm: (id: string, onlyOpen: boolean) => void;
  onCancel: (id: string) => void;
}) {
  const p = res.preview!;
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [gone, setGone] = useState(false);
  const closed = p.counts.window_closed;
  const willSend = p.counts.sends - (onlyOpen ? closed : 0);

  return (
    <Card>
      {p.reply && <div className="text-[13.5px] mb-2.5">{p.reply}</div>}

      {(res.reads || []).map((rd, i) => <ReadView key={i} rd={rd} />)}

      {p.writes.length > 0 && (
        <div className="mb-3">
          <SectionHead n={p.counts.writes} what="record badlega" />
          <div className="border border-[#E6E4DD] rounded-lg overflow-hidden bg-white">
            {p.writes.map((w, i) => <PlanRow key={i} w={w} />)}
          </div>
        </div>
      )}

      {p.sends.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#A32D2D] mb-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            {p.counts.sends} client ko WhatsApp jayega
          </div>
          <div className="bg-white border border-[#F5D7D7] rounded-lg overflow-hidden">
            <div className="px-3 py-2.5 bg-[#FDF6F6] text-[13px] border-b border-[#F5D7D7] whitespace-pre-wrap">
              {p.sends[0].text}
            </div>
            {p.sends.map((s, i) => (
              <div key={i} className="px-3 py-1.5 text-[12.5px] border-b border-[#F3F1EA] last:border-0 flex items-center justify-between gap-2">
                <span className="truncate">{s.label}</span>
                {!s.window_open && (
                  <span className="flex items-center gap-1 text-[11px] text-[#BA7517] flex-shrink-0">
                    <Clock className="w-3 h-3" /> window band
                  </span>
                )}
              </div>
            ))}
          </div>
          {closed > 0 && (
            <label className="flex items-start gap-2 mt-2 text-[12px] text-[#6B6F68]">
              <input type="checkbox" checked={onlyOpen} onChange={e => setOnlyOpen(e.target.checked)} className="mt-0.5" />
              <span>
                {closed} client ne pichhle 24 ghante me message nahi kiya — Twilio
                unko khula message nahi bhejne deta. Unko chhod do (recommended).
                Hataoge to Twilio unko reject kar sakta hai.
              </span>
            </label>
          )}
        </div>
      )}

      {p.counts.hidden > 0 && (
        <div className="text-[11.5px] text-[#9BA098] mb-2">…aur {p.counts.hidden} aur (list chhoti karke dikhayi hai, kaam sab pe hoga)</div>
      )}

      <Problems list={p.problems} />

      {p.big && (
        <div className="flex items-start gap-1.5 text-[12px] text-[#BA7517] bg-[#FFF6E8] border border-[#F2DFBE] rounded-lg px-2.5 py-2 mb-2.5">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          Ye bada kaam hai — list theek se dekh lo.
        </div>
      )}

      {gone ? (
        <div className="text-[12.5px] text-[#9BA098]">Faisla ho chuka.</div>
      ) : (
        <div className="flex gap-2 mt-1">
          <Btn variant="primary" onClick={() => { setGone(true); onConfirm(res.id!, onlyOpen); }}>
            {p.counts.sends > 0 ? `Bhejo (${willSend})` : "Haan, kardo"}
          </Btn>
          <Btn onClick={() => { setGone(true); onCancel(res.id!); }}>Rehne do</Btn>
        </div>
      )}
    </Card>
  );
}

function RanView({ run, onUndo }: { run: AiRunResult; onUndo: (id: string) => void }) {
  return (
    <Card tone="good">
      <div className="flex items-center gap-1.5 text-[13.5px] font-medium text-[#0F6E56] mb-2">
        <Check className="w-4 h-4" /> {run.done.length} kaam ho gaya
      </div>
      {run.done.slice(0, 25).map((d, i) => (
        <div key={i} className="text-[12.5px] mb-0.5">
          <span className="font-medium">{d.label}</span><span className="text-[#6B6F68]"> — {d.what}</span>
        </div>
      ))}
      {run.done.length > 25 && <div className="text-[11.5px] text-[#9BA098]">…aur {run.done.length - 25}</div>}
      {run.skipped.length > 0 && (
        <div className="mt-2 text-[12px] text-[#BA7517]">
          {run.skipped.length} chhod diye (24 ghante ka window band tha)
        </div>
      )}
      {run.failed.map((f, i) => (
        <div key={i} className="text-[12.5px] text-[#A32D2D] mt-1">{f.label} — {f.why}</div>
      ))}
      {run.can_undo && (
        <button onClick={() => onUndo(run.id)}
          className="mt-2.5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#185FA5]">
          <Undo2 className="w-3.5 h-3.5" /> Wapas karo
        </button>
      )}
    </Card>
  );
}

function ReadView({ rd }: { rd: AiRead }) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="text-[13.5px] font-medium mb-1.5">{rd.answer}</div>
      {rd.rows.length > 0 && (
        <div className="bg-white border border-[#E6E4DD] rounded-lg overflow-hidden">
          {rd.rows.map((r, i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 border-b border-[#F3F1EA] last:border-0">
              <div className="min-w-0">
                <div className="text-[13px] truncate">{r.name}</div>
                {r.sub && <div className="text-[11.5px] text-[#9BA098] truncate">{r.sub}</div>}
              </div>
              {r.value && <div className="text-[12.5px] font-medium font-mono flex-shrink-0">{r.value}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlanRow({ w }: { w: AiPlanItem }) {
  return (
    <div className="px-3 py-2 border-b border-[#F3F1EA] last:border-0">
      <div className="text-[13px] font-medium truncate">{w.label}</div>
      <div className="text-[11.5px] text-[#6B6F68]">{w.change}</div>
    </div>
  );
}

function SectionHead({ n, what }: { n: number; what: string }) {
  return <div className="text-[12px] font-semibold text-[#6B6F68] mb-1.5">{n} {what}</div>;
}

function Problems({ list }: { list?: string[] }) {
  if (!list || !list.length) return null;
  return (
    <div className="mt-2 mb-2 space-y-1">
      {list.map((p, i) => (
        <div key={i} className="flex items-start gap-1.5 text-[12px] text-[#BA7517]">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />{p}
        </div>
      ))}
    </div>
  );
}

function Card({ children, tone }: { children: React.ReactNode; tone?: "good" | "warn" }) {
  const border = tone === "good" ? "border-[#CBE9DD]" : tone === "warn" ? "border-[#F2DFBE]" : "border-[#E6E4DD]";
  const bg = tone === "warn" ? "bg-[#FFF6E8]" : "bg-white";
  return <div className={`${bg} border ${border} rounded-xl px-3.5 py-3 max-w-[95%]`}>{children}</div>;
}
