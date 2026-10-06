/* Dashboard — owner's one-glance view: paisa, compliance, bakaya, pipeline, team, followups.
   Sab CRM ke store se compute hota hai (login ke peeche; koi alag link/token nahi). */
import { useState } from "react";
import { Check } from "lucide-react";
import { useCrm } from "../../services/crmStore";
import { updateClient } from "../../services/crmApi";
import {
  balanceDue, currentCycle, currentPeriod, clientPeriods, filingEntry, isDefaulter,
  dueDatesForPeriod, daysUntil, fmtDate, quarterLabel, quarterStartIndex, monthLabel, todayIndex, money,
  waLink, KIND_FIRM_PAID, TASK_BUCKET,
  type Client,
} from "../../services/crmLogic";
import { Avatar, Metric, Panel, PageHead, Btn, Pill } from "./ui";
import ClientDrawer from "./ClientDrawer";

const OPEN_STATUSES = ["Yet to Pick", "Documents Pending", "Documents Received", "In progress", "Payment Pending"];
const DOCS_WAIT = new Set(["Yet to Pick", "Documents Pending"]);

export default function CrmDashboard() {
  const { clients, filingMap, payments, tasks, escalations, reload, loading } = useCrm();
  const [open, setOpen] = useState<Client | null>(null);

  const now = new Date();
  const yyyy = now.getFullYear(), mm = now.getMonth(), dd = now.getDate();

  /* ---------- Paisa ---------- */
  const clientPays = payments.filter(p => (p.kind || "client") !== KIND_FIRM_PAID);
  const payDate = (p: { paid_on?: string }) => (p.paid_on ? new Date(p.paid_on) : null);
  const todayColl = clientPays.filter(p => { const d = payDate(p); return d && d.getFullYear() === yyyy && d.getMonth() === mm && d.getDate() === dd; })
    .reduce((a, p) => a + (p.amount || 0), 0);
  const monthColl = clientPays.filter(p => { const d = payDate(p); return d && d.getFullYear() === yyyy && d.getMonth() === mm; })
    .reduce((a, p) => a + (p.amount || 0), 0);

  /* ---------- Bakaya (outstanding) ---------- */
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

  /* ---------- Team workload (Workflow tasks: us vs client) ---------- */
  type TRow = { name: string; total: number; us: number; client: number; oldest: number };
  const team: Record<string, TRow> = {};
  let unassigned = 0;
  tasks.forEach(t => {
    const bucket = TASK_BUCKET[t.status || ""] || "client";
    if (bucket === "done") return;
    const name = (t.assigned_to || "").trim();
    if (!name) { unassigned++; return; }
    const r = team[name] || (team[name] = { name, total: 0, us: 0, client: 0, oldest: 0 });
    r.total++;
    if (bucket === "us") r.us++; else if (bucket === "client") r.client++;
    const d = daysOf(t.status_changed_at || t.created_at); if (d != null && d > r.oldest) r.oldest = d;
  });
  const teamList = Object.values(team).sort((a, b) => b.total - a.total);

  /* ---------- Followups + defaulters + alerts ---------- */
  const followups = clients.filter(c => c.followup_text);
  const defaulters = clients.filter(c => isDefaulter(c, filingMap));
  const openEsc = escalations.filter(e => (e.status || "") === "open");

  async function markDone(c: Client) { await updateClient(c.id, { followup_text: null }); await reload(); }

  const t = todayIndex();

  return (
    <div className="h-full overflow-y-auto bg-[#F6F5F1] p-5 md:p-7">
      <PageHead title="Dashboard" sub={`Current period: ${quarterLabel(quarterStartIndex(t))} · ${monthLabel(t)}`} />

      {loading ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-9 w-9 border-b-2 border-[#0F6E56]" /></div> : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
            <Metric label="Aaj collection" value={money(todayColl)} sub="client payments" tone="good" />
            <Metric label="Is mahine" value={money(monthColl)} sub="total aaya" />
            <Metric label="Outstanding (all)" value={money(totalDue)} sub={`${bakaya.length} clients pending`} tone="danger" />
            <Metric label="Filed this quarter" value={`${filedThisQ} / ${qClients.length}`} sub={`${qClients.length ? Math.round(filedThisQ / qClients.length * 100) : 0}% complete`} tone="good" />
          </div>

          {/* Compliance */}
          <SectionTitle>
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
              <SectionTitle>Bakaya — sabse zyada upar</SectionTitle>
              <Panel>
                {bakaya.length ? bakaya.slice(0, 8).map(({ c, bal }) => (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#E6E4DD] last:border-0">
                    <Avatar name={c.name} onClick={() => setOpen(c)} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-medium truncate">{c.name}</div>
                      <div className="text-[12px] text-[#6B6F68]">{c.business_name || c.mobile || "—"}</div>
                    </div>
                    <div className="text-[13.5px] font-semibold font-mono text-[#A32D2D] whitespace-nowrap">{money(bal)}</div>
                    {c.mobile && <a href={waLink(c.mobile, `Namaste ${c.name}, aapka ${money(bal)} payment pending hai.`)} target="_blank" rel="noreferrer"><Btn size="sm">WA</Btn></a>}
                  </div>
                )) : <Empty>Koi bakaya nahi 🎉</Empty>}
                {bakaya.length > 8 && <div className="px-4 py-2.5 text-[12px] text-[#6B6F68]">+ {bakaya.length - 8} aur bakaya</div>}
              </Panel>
            </div>

            {/* Pipeline */}
            <div>
              <SectionTitle>Kaam ka status — Workflow</SectionTitle>
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
                <div className="px-4 py-2.5 border-t border-[#E6E4DD] text-[12.5px] text-[#6B6F68]">{inProgress} abhi In progress</div>
              </Panel>
            </div>
          </div>

          {/* Docs waiting + Team */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
            <div>
              <SectionTitle>Documents ka wait</SectionTitle>
              <Panel>
                {docsWait.length ? docsWait.map(({ t: tk, days }) => (
                  <div key={tk.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#E6E4DD] last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-medium truncate">{tk.name} {tk.category ? <span className="text-[#6B6F68]">— {tk.category}</span> : null}</div>
                    </div>
                    <Pill status={days != null && days >= 8 ? "Overdue" : days != null && days >= 4 ? "In progress" : ""}>{days == null ? "—" : `${days}d`}</Pill>
                  </div>
                )) : <Empty>Koi documents pending nahi.</Empty>}
              </Panel>
            </div>

            <div>
              <SectionTitle>Team workload</SectionTitle>
              <Panel>
                {teamList.length ? teamList.map(r => (
                  <div key={r.name} className="flex items-center gap-3 px-4 py-3 border-b border-[#E6E4DD] last:border-0">
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
                {unassigned > 0 && <div className="px-4 py-2.5 text-[12.5px] text-[#BA7517]">{unassigned} unassigned — kisi ko do</div>}
              </Panel>
            </div>
          </div>

          {/* Alerts */}
          <SectionTitle>Alerts — tumhara jawab chahiye {openEsc.length > 0 && <span className="text-[12px] text-[#A32D2D] font-semibold">({openEsc.length})</span>}</SectionTitle>
          <Panel>
            {openEsc.length ? openEsc.slice(0, 8).map(e => (
              <div key={e.id} className="flex items-start gap-3 px-4 py-3 border-b border-[#E6E4DD] last:border-0">
                <span className="text-[14px] mt-0.5">🔔</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px]">{e.question || e.reason || "—"}</div>
                  {e.mobile && <div className="text-[11.5px] text-[#9BA098]">{e.mobile}</div>}
                </div>
              </div>
            )) : <Empty>Koi alert nahi — sab theek ✅</Empty>}
          </Panel>

          {/* Today's followups */}
          <SectionTitle>Today's followups</SectionTitle>
          <Panel>
            {followups.length ? followups.map(c => (
              <div key={c.id} className="flex items-center gap-3.5 px-4 py-3 border-b border-[#E6E4DD] last:border-0">
                <button onClick={() => markDone(c)} className="w-6 h-6 rounded-full border-[1.5px] border-[#E6E4DD] hover:border-[#0F6E56] text-transparent hover:text-[#0F6E56] flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <div className="w-24 flex-shrink-0 text-[12px] text-[#6B6F68] font-mono">{c.followup_text}</div>
                <div className="flex-1 min-w-0"><div className="text-[13.5px] font-medium truncate">{c.name}</div><div className="text-[12.5px] text-[#6B6F68] truncate">{c.business_name || "—"}</div></div>
                <Btn size="sm" onClick={() => setOpen(c)}>Open</Btn>
              </div>
            )) : <Empty>Koi followup pending nahi.</Empty>}
          </Panel>

          {/* Defaulters */}
          <SectionTitle>Needs attention — quarterly defaulters</SectionTitle>
          <Panel>
            {defaulters.length ? defaulters.map(c => (
              <div key={c.id} className="flex items-center gap-3.5 px-4 py-3 border-b border-[#E6E4DD] last:border-0">
                <Avatar name={c.name} onClick={() => setOpen(c)} />
                <div className="flex-1 min-w-0"><div className="text-[13.5px] font-medium truncate">{c.name}</div><div className="text-[12.5px] text-[#6B6F68]">Pichle 3 quarters file nahi hue</div></div>
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[14.5px] font-semibold mt-6 mb-3 first:mt-0">{children}</h2>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-5 text-[12.5px] text-[#9BA098]">{children}</div>;
}
