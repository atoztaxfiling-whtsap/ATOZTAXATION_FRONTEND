/* Dashboard — owner's one-glance view: paisa, compliance, bakaya, pipeline, team, followups.
   Sab CRM ke store se compute hota hai (login ke peeche; koi alag link/token nahi).
   Har section click karke uske tab pe ja sakte ho (onGoto). Workflow ka paisa bhi wired. */
import { useState, useEffect } from "react";
import { Check, ChevronRight, X, CalendarClock } from "lucide-react";
import { useCrm } from "../../services/crmStore";
import { updateClient, closeEscalation, fetchWorkflowMoney } from "../../services/crmApi";
import {
  balanceDue, currentCycle, currentPeriod, clientPeriods, filingEntry, isDefaulter,
  dueDatesForPeriod, daysUntil, fmtDate, quarterLabel, quarterStartIndex, monthLabel, todayIndex, money,
  waLink, KIND_FIRM_PAID, isTaskBillable, buildWorkItems, UNASSIGNED_LABEL,
  type Client,
} from "../../services/crmLogic";
import { Avatar, Metric, Panel, PageHead, Btn, Pill } from "./ui";
import ClientDrawer from "./ClientDrawer";

const OPEN_STATUSES = ["Yet to Pick", "Documents Pending", "Documents Received", "In progress", "Payment Pending"];
const DOCS_WAIT = new Set(["Yet to Pick", "Documents Pending"]);

/* GST cadence — backend cadence.py ke saath mel (B2B 13, baaki 20) */
const GST_DEADLINE: Record<string, number> = { b2b: 13, ecommerce: 20, b2c: 20, nil: 20, unknown: 20 };
const GST_BEFORE: Record<string, number[]> = {
  b2b: [10, 5, 2, 1], ecommerce: [10, 5, 1], b2c: [5, 1], nil: [7, 2], unknown: [10, 5, 2, 1],
};
const BT_LABEL: Record<string, string> = { b2b: "B2B", ecommerce: "E-com", b2c: "B2C", nil: "Nil", unknown: "Other" };

type Tab = string;

export default function CrmDashboard({ onGoto }: { onGoto?: (tab: Tab) => void }) {
  const { clients, filings, filingMap, payments, tasks, registrations, escalations, reload, loading, removeLocal } = useCrm();
  const [open, setOpen] = useState<Client | null>(null);
  const [wf, setWf] = useState<{ today: number; month: number; open_advance: number }>({ today: 0, month: 0, open_advance: 0 });
  const go = (t: Tab) => onGoto && onGoto(t);

  /* Workflow ka paisa archive se (Closed+paid task archive ho jaata hai, isliye
     is mahine archive = is mahine aaya). Fail ho to 0 — dashboard chalta rahe. */
  useEffect(() => { fetchWorkflowMoney().then(setWf).catch(() => { }); }, []);

  const now = new Date();
  const yyyy = now.getFullYear(), mm = now.getMonth(), dd = now.getDate();

  /* ---------- Paisa (GST/client payments table se) ---------- */
  const clientPays = payments.filter(p => (p.kind || "client") !== KIND_FIRM_PAID);
  const payDate = (p: { paid_on?: string }) => (p.paid_on ? new Date(p.paid_on) : null);
  const gstToday = clientPays.filter(p => { const d = payDate(p); return d && d.getFullYear() === yyyy && d.getMonth() === mm && d.getDate() === dd; })
    .reduce((a, p) => a + (p.amount || 0), 0);
  const gstMonth = clientPays.filter(p => { const d = payDate(p); return d && d.getFullYear() === yyyy && d.getMonth() === mm; })
    .reduce((a, p) => a + (p.amount || 0), 0);
  /* Total collection = GST/client payments + workflow (archive) — workflow
     payments table me nahi hote, isliye double count nahi hota. */
  const todayColl = gstToday + (wf.today || 0);
  const monthColl = gstMonth + (wf.month || 0);

  /* ---------- Workflow baaki (abhi khule billable tasks) ---------- */
  const wfOutstanding = tasks.reduce((a, t) => {
    if (!isTaskBillable(t.status)) return a;
    const left = (Number(t.fee_agreed) || 0) - (Number(t.amount_paid) || 0);
    return a + (left > 0 ? left : 0);
  }, 0);
  const wfBillableOpen = tasks.filter(t => isTaskBillable(t.status) && ((Number(t.fee_agreed) || 0) - (Number(t.amount_paid) || 0)) > 0).length;

  /* ---------- Bakaya (outstanding — GST periods + firm-paid + workflow sab milake) ---------- */
  const bakaya = clients
    .map(c => ({ c, bal: balanceDue(c, filingMap, payments, tasks) }))
    .filter(x => x.bal > 0)
    .sort((a, b) => b.bal - a.bal);
  const totalDue = bakaya.reduce((a, x) => a + x.bal, 0);

  /* ---------- Returns filed this period ---------- */
  const qClients = clients.filter(c => currentCycle(c) === "quarterly");
  const filedThisQ = qClients.filter(c => { const cp = currentPeriod(c); return cp && filingEntry(filingMap, c.id, cp.key).status === "Completed"; }).length;

  /* ---------- Compliance (aggregated GST due dates) ---------- */
  type Comp = { label: string; period: string; date: Date; diff: number; pending: number; total: number };
  const compMap = new Map<string, Comp>();
  clients.forEach(c => {
    clientPeriods(c).forEach(cp => {
      const done = filingEntry(filingMap, c.id, cp.key).status === "Completed";
      dueDatesForPeriod(cp).forEach(d => {
        const diff = daysUntil(d.date);
        if (diff > 25 || diff < -15) return;
        const k = `${d.label}|${cp.label}|${d.date.getTime()}`;
        const e = compMap.get(k) || { label: d.label, period: cp.label, date: d.date, diff, pending: 0, total: 0 };
        e.total++; if (!done) e.pending++;
        compMap.set(k, e);
      });
    });
  });
  const compliance = [...compMap.values()].filter(e => e.pending > 0).sort((a, b) => a.diff - b.diff).slice(0, 8);
  const lateRisk = compliance.filter(e => e.diff < 0 || e.diff <= 4).length;

  /* ---------- GST reminder calendar (bot kin dino pe followup bhejega) ---------- */
  type RemDay = { date: Date; diff: number; count: number; types: Record<string, number>; deadline: boolean };
  const remMap = new Map<string, RemDay>();
  const addRem = (date: Date, bt: string, deadline: boolean) => {
    const diff = daysUntil(date);
    if (diff < 0 || diff > 21) return;      // sirf aane wale ~3 hafte
    const k = date.toDateString();
    const e = remMap.get(k) || { date, diff, count: 0, types: {}, deadline: false };
    e.count++; e.types[bt] = (e.types[bt] || 0) + 1; if (deadline) e.deadline = true;
    remMap.set(k, e);
  };
  clients.forEach(c => {
    if ((c.filing_mode || "") === "manual-annual") return;
    const cp = currentPeriod(c);
    if (!cp) return;
    if (filingEntry(filingMap, c.id, cp.key).status === "Completed") return;  // ho gaya -> reminder nahi
    const bt = (c.business_type || "unknown").toLowerCase();
    const day = Math.min(GST_DEADLINE[bt] || 20, 28);
    const offsets = GST_BEFORE[bt] || GST_BEFORE.unknown;
    // active deadline: is mahine ki, nikal gayi ho to agle mahine ki
    let dl = new Date(yyyy, mm, day);
    if (dd > day) dl = new Date(yyyy, mm + 1, day);
    offsets.forEach(off => addRem(new Date(dl.getFullYear(), dl.getMonth(), dl.getDate() - off), bt, false));
    addRem(dl, bt, true);  // last date khud
  });
  const remCal = [...remMap.values()].sort((a, b) => a.diff - b.diff).slice(0, 10);

  /* ---------- Pipeline (Workflow tasks by status) ---------- */
  const pipe = OPEN_STATUSES.map(s => ({ s, n: tasks.filter(t => (t.status || "") === s).length }));
  const pipeMax = Math.max(1, ...pipe.map(p => p.n));
  const inProgress = tasks.filter(t => (t.status || "") === "In progress").length;

  /* ---------- Docs waiting ---------- */
  const daysOf = (iso?: string | null) => { if (!iso) return null; const d = new Date(iso); return Math.round((now.getTime() - d.getTime()) / 86400000); };
  const docsWait = tasks
    .filter(t => DOCS_WAIT.has(t.status || ""))
    .map(t => ({ t, days: daysOf(t.status_changed_at || t.created_at) }))
    .sort((a, b) => (b.days ?? 0) - (a.days ?? 0))
    .slice(0, 6);

  /* ---------- Team workload (teeno: GST returns/filings + workflow + registrations) ---------- */
  type TRow = { name: string; total: number; us: number; client: number; oldest: number };
  const workItems = buildWorkItems(clients, filings, tasks, registrations);
  const team: Record<string, TRow> = {};
  let unassigned = 0;
  workItems.forEach(it => {
    if (it.bucket === "done") return;
    const name = it.assignedTo && it.assignedTo !== UNASSIGNED_LABEL ? it.assignedTo : "";
    if (!name) { unassigned++; return; }
    const r = team[name] || (team[name] = { name, total: 0, us: 0, client: 0, oldest: 0 });
    r.total++;
    if (it.bucket === "us") r.us++; else if (it.bucket === "client") r.client++;
    if (it.days > r.oldest) r.oldest = it.days;   // us/client ke alawa 'dept' sirf total me
  });
  const teamList = Object.values(team).sort((a, b) => b.total - a.total);

  /* ---------- Followups + defaulters + alerts ---------- */
  const followups = clients.filter(c => c.followup_text);
  const defaulters = clients.filter(c => isDefaulter(c, filingMap));
  const openEsc = escalations.filter(e => (e.status || "") === "open");

  async function markDone(c: Client) { await updateClient(c.id, { followup_text: null }); await reload(); }
  async function dismissAlert(id: string) {
    removeLocal("escalations", id);          // turant UI se hatao
    try { await closeEscalation(id); } catch { await reload(); }   // phir server pe close
  }

  const t = todayIndex();

  return (
    <div className="h-full overflow-y-auto bg-[#F6F5F1] p-5 md:p-7">
      <PageHead title="Dashboard" sub={`Current period: ${quarterLabel(quarterStartIndex(t))} · ${monthLabel(t)}`} />

      {loading ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-9 w-9 border-b-2 border-[#0F6E56]" /></div> : (
        <>
          {/* KPI row — paisa */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-3.5">
            <button onClick={() => go("payments")} className="text-left"><Metric label="Aaj collection" value={money(todayColl)} sub="GST + workflow →" tone="good" /></button>
            <button onClick={() => go("payments")} className="text-left"><Metric label="Is mahine" value={money(monthColl)} sub="GST + workflow →" /></button>
            <button onClick={() => go("payments")} className="text-left"><Metric label="Outstanding (all)" value={money(totalDue)} sub={`${bakaya.length} clients · GST+workflow →`} tone="danger" /></button>
            <button onClick={() => go("filings")} className="text-left"><Metric label="Filed this quarter" value={`${filedThisQ} / ${qClients.length}`} sub={`${qClients.length ? Math.round(filedThisQ / qClients.length * 100) : 0}% complete →`} tone="good" /></button>
          </div>

          {/* Workflow ka paisa — alag se, taaki wire dikhe */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
            <button onClick={() => go("workflow")} className="text-left"><Metric label="Workflow collected" value={money(wf.month)} sub="is mahine (archive) →" tone="good" /></button>
            <button onClick={() => go("workflow")} className="text-left"><Metric label="Workflow baaki" value={money(wfOutstanding)} sub={`${wfBillableOpen} kaam pe pending →`} tone={wfOutstanding > 0 ? "danger" : undefined} /></button>
          </div>

          {/* GST reminder calendar — bot kin dino pe followup bhejega */}
          <SectionTitle onClick={() => go("review")} linkLabel="Review">
            <span className="inline-flex items-center gap-1.5"><CalendarClock className="w-4 h-4 text-[#0F6E56]" />GST reminder calendar — kab kya jayega</span>
          </SectionTitle>
          <Panel>
            {remCal.length ? remCal.map((r, i) => {
              const parts = Object.entries(r.types).map(([bt, n]) => `${n} ${BT_LABEL[bt] || bt}`).join(" · ");
              return (
                <div key={i} className="flex items-center gap-3.5 px-4 py-3 border-b border-[#E6E4DD] last:border-0">
                  <div className="w-16 flex-shrink-0 text-[12.5px] font-semibold font-mono text-[#1C1E1B]">{fmtDate(r.date)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-medium">{r.deadline ? "Last date (GST return)" : `${r.count} client ko reminder`}</div>
                    <div className="text-[12px] text-[#6B6F68] truncate">{parts}</div>
                  </div>
                  <Pill status={r.deadline ? "Overdue" : r.diff <= 1 ? "In progress" : ""}>
                    {r.diff === 0 ? "aaj" : r.diff === 1 ? "kal" : `${r.diff}d baad`}
                  </Pill>
                </div>
              );
            }) : <Empty>Agle ~3 hafte me koi GST reminder due nahi (cadence ke hisaab se).</Empty>}
          </Panel>

          {/* Compliance */}
          <SectionTitle onClick={() => go("filings")} linkLabel="Filings">
            Compliance calendar — GST deadlines
            {lateRisk > 0 && <span className="ml-2 text-[12px] font-semibold text-[#A32D2D]">⚠ {lateRisk} late-risk</span>}
          </SectionTitle>
          <Panel>
            {compliance.length ? compliance.map((e, i) => (
              <div key={i} className="flex items-center gap-3.5 px-4 py-3 border-b border-[#E6E4DD] last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-medium truncate">{e.label} — {e.period}</div>
                  <div className="text-[12.5px] text-[#6B6F68]">Due {fmtDate(e.date)} · {e.pending}/{e.total} pending</div>
                </div>
                <Pill status={e.diff < 0 ? "Overdue" : e.diff <= 4 ? "In progress" : ""}>
                  {e.diff < 0 ? `${Math.abs(e.diff)}d late` : e.diff === 0 ? "Due today" : `${e.diff}d left`}
                </Pill>
              </div>
            )) : <Empty>Agle kuch din me koi GST deadline pending nahi.</Empty>}
          </Panel>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
            {/* Bakaya */}
            <div>
              <SectionTitle onClick={() => go("payments")} linkLabel="Payments">Bakaya — sabse zyada upar</SectionTitle>
              <Panel>
                {bakaya.length ? bakaya.slice(0, 8).map(({ c, bal }) => (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#E6E4DD] last:border-0">
                    <Avatar name={c.name} onClick={() => setOpen(c)} />
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setOpen(c)}>
                      <div className="text-[13.5px] font-medium truncate">{c.name}</div>
                      <div className="text-[12px] text-[#6B6F68]">{c.business_name || c.mobile || "—"}</div>
                    </div>
                    <div className="text-[13.5px] font-semibold font-mono text-[#A32D2D] whitespace-nowrap">{money(bal)}</div>
                    {c.mobile && <a href={waLink(c.mobile, `Namaste ${c.name}, aapka ${money(bal)} payment pending hai.`)} target="_blank" rel="noreferrer"><Btn size="sm">WA</Btn></a>}
                  </div>
                )) : <Empty>Koi bakaya nahi 🎉</Empty>}
                {bakaya.length > 8 && <button onClick={() => go("payments")} className="w-full text-left px-4 py-2.5 text-[12px] text-[#0F6E56] font-medium hover:bg-[#FBFAF7]">+ {bakaya.length - 8} aur bakaya — sab dekho →</button>}
              </Panel>
            </div>

            {/* Pipeline */}
            <div>
              <SectionTitle onClick={() => go("workflow")} linkLabel="Workflow">Kaam ka status — Workflow</SectionTitle>
              <Panel>
                <div className="px-4 py-3">
                  {pipe.map(p => (
                    <div key={p.s} className="flex items-center gap-3 mb-2.5 last:mb-0">
                      <div className="w-32 text-[12px] text-[#6B6F68] truncate">{p.s}</div>
                      <div className="flex-1 h-4 bg-[#F0EEE8] rounded-md overflow-hidden">
                        <div className={`h-full rounded-md ${p.s === "Payment Pending" ? "bg-[#A32D2D]" : "bg-[#0F6E56]"}`} style={{ width: `${Math.round(p.n / pipeMax * 100)}%` }} />
                      </div>
                      <div className="w-7 text-right text-[13px] font-semibold font-mono">{p.n}</div>
                    </div>
                  ))}
                </div>
                <button onClick={() => go("workflow")} className="w-full text-left px-4 py-2.5 border-t border-[#E6E4DD] text-[12.5px] text-[#0F6E56] font-medium hover:bg-[#FBFAF7]">{inProgress} abhi In progress — Workflow kholo →</button>
              </Panel>
            </div>
          </div>

          {/* Docs waiting + Team */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
            <div>
              <SectionTitle onClick={() => go("workflow")} linkLabel="Workflow">Documents ka wait</SectionTitle>
              <Panel>
                {docsWait.length ? docsWait.map(({ t: tk, days }) => (
                  <div key={tk.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#E6E4DD] last:border-0 cursor-pointer hover:bg-[#FBFAF7]" onClick={() => go("workflow")}>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-medium truncate">{tk.name} {tk.category ? <span className="text-[#6B6F68]">— {tk.category}</span> : null}</div>
                    </div>
                    <Pill status={days != null && days >= 8 ? "Overdue" : days != null && days >= 4 ? "In progress" : ""}>{days == null ? "—" : `${days}d`}</Pill>
                  </div>
                )) : <Empty>Koi documents pending nahi.</Empty>}
              </Panel>
            </div>

            <div>
              <SectionTitle onClick={() => go("pending")} linkLabel="Pending task">Team workload — sab kaam</SectionTitle>
              <Panel>
                <div className="px-4 py-2 text-[11.5px] text-[#9BA098] border-b border-[#E6E4DD]">GST returns + workflow + registration — teeno milake har staff ka bojh.</div>
                {teamList.length ? teamList.map(r => (
                  <div key={r.name} className="flex items-center gap-3 px-4 py-3 border-b border-[#E6E4DD] last:border-0 cursor-pointer hover:bg-[#FBFAF7]" onClick={() => go("pending")}>
                    <Avatar name={r.name} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-medium truncate">{r.name}</div>
                      <div className="text-[12px] text-[#6B6F68]">sabse purana: {r.oldest}d</div>
                    </div>
                    <div className="flex gap-3.5 text-center">
                      <div><div className="text-[15px] font-semibold font-mono">{r.total}</div><div className="text-[10px] text-[#9BA098] uppercase">Total</div></div>
                      <div><div className="text-[15px] font-semibold font-mono text-[#A32D2D]">{r.us}</div><div className="text-[10px] text-[#9BA098] uppercase">Hum pe</div></div>
                      <div><div className="text-[15px] font-semibold font-mono text-[#6B6F68]">{r.client}</div><div className="text-[10px] text-[#9BA098] uppercase">Client pe</div></div>
                    </div>
                  </div>
                )) : <Empty>Koi workflow task assigned nahi.</Empty>}
                {unassigned > 0 && <button onClick={() => go("pending")} className="w-full text-left px-4 py-2.5 text-[12.5px] text-[#BA7517] font-medium hover:bg-[#FBFAF7]">{unassigned} unassigned — kisi ko do →</button>}
              </Panel>
            </div>
          </div>

          {/* Alerts — dismiss ho jaate hain (dekh liya to X dabao) */}
          <SectionTitle>Alerts — tumhara jawab chahiye {openEsc.length > 0 && <span className="text-[12px] text-[#A32D2D] font-semibold">({openEsc.length})</span>}</SectionTitle>
          <Panel>
            {openEsc.length ? openEsc.slice(0, 10).map(e => (
              <div key={e.id} className="flex items-start gap-3 px-4 py-3 border-b border-[#E6E4DD] last:border-0">
                <span className="text-[14px] mt-0.5">🔔</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px]">{e.question || e.reason || "—"}</div>
                  {e.mobile && <div className="text-[11.5px] text-[#9BA098]">{e.mobile}</div>}
                </div>
                <button onClick={() => dismissAlert(e.id)} title="Dekh liya — hata do"
                  className="flex-shrink-0 text-[#9BA098] hover:text-[#A32D2D] p-1 -mr-1 rounded-md hover:bg-[#FCEBEB]">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )) : <Empty>Koi alert nahi — sab theek ✅</Empty>}
          </Panel>

          {/* Followup notes (manual) — ye bot wale auto-followup NAHI hain */}
          <SectionTitle onClick={() => go("followups")} linkLabel="Followups">Followup notes (manual)</SectionTitle>
          <Panel>
            <div className="px-4 py-2 text-[11.5px] text-[#9BA098] border-b border-[#E6E4DD]">Ye CRM me haath se lagaye followup note hain — bot ke auto-followup Review tab me hote hain.</div>
            {followups.length ? followups.map(c => (
              <div key={c.id} className="flex items-center gap-3.5 px-4 py-3 border-b border-[#E6E4DD] last:border-0">
                <button onClick={() => markDone(c)} className="w-6 h-6 rounded-full border-[1.5px] border-[#E6E4DD] hover:border-[#0F6E56] text-transparent hover:text-[#0F6E56] flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <div className="w-24 flex-shrink-0 text-[12px] text-[#6B6F68] font-mono">{c.followup_text}</div>
                <div className="flex-1 min-w-0"><div className="text-[13.5px] font-medium truncate">{c.name}</div><div className="text-[12.5px] text-[#6B6F68] truncate">{c.business_name || "—"}</div></div>
                <Btn size="sm" onClick={() => setOpen(c)}>Open</Btn>
              </div>
            )) : <Empty>Koi manual followup note nahi.</Empty>}
          </Panel>

          {/* Defaulters */}
          <SectionTitle onClick={() => go("filings")} linkLabel="Filings">Needs attention — quarterly defaulters</SectionTitle>
          <Panel>
            {defaulters.length ? defaulters.map(c => (
              <div key={c.id} className="flex items-center gap-3.5 px-4 py-3 border-b border-[#E6E4DD] last:border-0">
                <Avatar name={c.name} onClick={() => setOpen(c)} />
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setOpen(c)}><div className="text-[13.5px] font-medium truncate">{c.name}</div><div className="text-[12.5px] text-[#6B6F68]">Pichle 3 quarters file nahi hue</div></div>
                <Pill status="Not Responding">Defaulter</Pill>
              </div>
            )) : <Empty>Abhi koi defaulter nahi.</Empty>}
          </Panel>
          <div className="h-8" />
        </>
      )}

      {open && <ClientDrawer client={clients.find(c => c.id === open.id) || open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function SectionTitle({ children, onClick, linkLabel }: { children: React.ReactNode; onClick?: () => void; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between mt-6 mb-3 first:mt-0">
      <h2 className="text-[14.5px] font-semibold">{children}</h2>
      {onClick && (
        <button onClick={onClick} className="inline-flex items-center gap-0.5 text-[12px] font-medium text-[#0F6E56] hover:underline flex-shrink-0">
          {linkLabel || "Dekho"}<ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-5 text-[12.5px] text-[#9BA098]">{children}</div>;
}
