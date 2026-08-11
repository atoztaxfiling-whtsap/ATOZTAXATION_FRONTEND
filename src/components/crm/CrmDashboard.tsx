/* Dashboard — metrics, GST due dates, aaj ke followups, defaulters */
import { useState } from "react";
import { Check } from "lucide-react";
import { useCrm } from "../../services/crmStore";
import { updateClient } from "../../services/crmApi";
import {
  balanceDue, currentCycle, currentPeriod, clientPeriods, filingEntry, isDefaulter,
  dueDatesForPeriod, daysUntil, fmtDate, quarterLabel, quarterStartIndex, monthLabel, todayIndex, money,
  type Client,
} from "../../services/crmLogic";
import { Avatar, Metric, Panel, PageHead, Btn, Pill } from "./ui";
import ClientDrawer from "./ClientDrawer";

export default function CrmDashboard() {
  const { clients, filingMap, payments, tasks, reload, loading } = useCrm();
  const [open, setOpen] = useState<Client | null>(null);

  const totalDue = clients.reduce((a, c) => a + balanceDue(c, filingMap, payments, tasks), 0);
  const qClients = clients.filter(c => currentCycle(c) === "quarterly");
  const filedThisQ = qClients.filter(c => { const cp = currentPeriod(c); return cp && filingEntry(filingMap, c.id, cp.key).status === "Completed"; }).length;
  const followups = clients.filter(c => c.followup_text);
  const defaulters = clients.filter(c => isDefaulter(c, filingMap));
  const withBalance = clients.filter(c => balanceDue(c, filingMap, payments, tasks) > 0).length;

  // Aane wali GST due dates (10 din aage, 30 din peeche tak)
  const dueList: Array<{ c: Client; label: string; date: Date; diff: number; period: string }> = [];
  clients.forEach(c => {
    clientPeriods(c).forEach(cp => {
      if (filingEntry(filingMap, c.id, cp.key).status === "Completed") return;
      dueDatesForPeriod(cp).forEach(d => {
        const diff = daysUntil(d.date);
        if (diff <= 10 && diff >= -30) dueList.push({ c, label: d.label, date: d.date, diff, period: cp.label });
      });
    });
  });
  dueList.sort((a, b) => a.diff - b.diff);

  async function markDone(c: Client) { await updateClient(c.id, { followup_text: null }); await reload(); }

  const t = todayIndex();

  return (
    <div className="h-full overflow-y-auto bg-[#F6F5F1] p-5 md:p-7">
      <PageHead title="Dashboard" sub={`Current period: ${quarterLabel(quarterStartIndex(t))} · ${monthLabel(t)}`} />

      {loading ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-9 w-9 border-b-2 border-[#0F6E56]" /></div> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
            <Metric label="Total clients" value={clients.length} sub={`${qClients.length} quarterly now · ${clients.length - qClients.length} monthly now`} />
            <Metric label="Open followups" value={followups.length} sub="across all clients" tone="warn" />
            <Metric label="Balance due (all)" value={money(totalDue)} sub={`${withBalance} clients pending`} tone="danger" />
            <Metric label="Filed this quarter" value={`${filedThisQ} / ${qClients.length}`} sub={`${qClients.length ? Math.round(filedThisQ / qClients.length * 100) : 0}% complete`} tone="good" />
          </div>

          <SectionTitle>Upcoming GST due dates</SectionTitle>
          <Panel>
            {dueList.length ? dueList.slice(0, 8).map((d, i) => (
              <div key={i} className="flex items-center gap-3.5 px-4 py-3 border-b border-[#E6E4DD] last:border-0">
                <Avatar name={d.c.name} onClick={() => setOpen(d.c)} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-medium truncate">{d.c.name} — {d.label} ({d.period})</div>
                  <div className="text-[12.5px] text-[#6B6F68]">Due {fmtDate(d.date)}</div>
                </div>
                <Pill status={d.diff < 0 ? "Overdue" : d.diff <= 3 ? "In progress" : ""}>
                  {d.diff < 0 ? `Overdue by ${Math.abs(d.diff)}d` : d.diff === 0 ? "Due today" : `${d.diff}d left`}
                </Pill>
              </div>
            )) : <Empty>Agle 10 din me kuch due nahi.</Empty>}
          </Panel>

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
