/* Payments — collected / pending / balance wale clients */
import { useState } from "react";
import { useCrm } from "../../services/crmStore";
import { balanceDue, totalPaid, currentCycle, money, isTaskBillable, isFilingBillable, type Client } from "../../services/crmLogic";
import { Avatar, Pill, Panel, PageHead, Metric, Btn, Scroller, Th, Td, EmptyRow } from "./ui";
import ClientDrawer from "./ClientDrawer";

/* 14+ din se ruka payment -> "Call list" (direct call karo). Badalna ho to yahan. */
const CALL_AFTER_DAYS = 14;

export default function Payments() {
  const { clients, filingMap, filings, payments, tasks, loading } = useCrm();
  const [open, setOpen] = useState<Client | null>(null);
  const [tab, setTab] = useState<"pending" | "call">("pending");

  const collected = clients.reduce((a, c) => a + totalPaid(c, payments, tasks), 0);
  const clientPending = clients.reduce((a, c) => a + balanceDue(c, filingMap, payments, tasks), 0);
  const withBal = clients.filter(c => balanceDue(c, filingMap, payments, tasks) > 0).length;

  /* Paisa kitne din se ruka: client ke sabse PURANE billable (kaam poora)
     hone ki taareekh se. status_changed_at (asli status-change) ya created_at
     — updated_at NAHI (sync usse aage khiska deta hai, days galat ho jate). */
  function pendingDays(c: Client): number {
    let oldest = Infinity;
    for (const f of filings) {
      if (f.client_id === c.id && isFilingBillable(f.status)) {
        const t = Date.parse(f.status_changed_at || f.created_at || "");
        if (!isNaN(t) && t < oldest) oldest = t;
      }
    }
    for (const t2 of tasks) {
      if (t2.client_id === c.id && isTaskBillable(t2.status)) {
        const t = Date.parse(t2.status_changed_at || t2.created_at || "");
        if (!isNaN(t) && t < oldest) oldest = t;
      }
    }
    if (oldest === Infinity) return 0;
    const d = Math.floor((Date.now() - oldest) / 86400000);
    return d < 0 ? 0 : d;
  }

  /* SIRF pending clients (balance > 0). Puri client list nahi. */
  const pendingAll = clients
    .filter(c => balanceDue(c, filingMap, payments, tasks) > 0)
    .map(c => ({ c, bal: balanceDue(c, filingMap, payments, tasks), days: pendingDays(c) }))
    .sort((a, b) => b.days - a.days || b.bal - a.bal);

  const callList = pendingAll.filter(x => x.days >= CALL_AFTER_DAYS);
  const recent = pendingAll.filter(x => x.days < CALL_AFTER_DAYS);
  const rows = tab === "call" ? callList : recent;

  /* ---- Workflow kaam ----
     Jo task kisi client se juda hai uska paisa upar client ke balance me
     already gin liya gaya. Jo task kisi se juda hi nahi (walk-in) uska
     paisa PEHLE KAHIN NAHI DIKHTA THA — na yahan, na kisi ke balance me.
     Isliye unhe alag se ginte hain aur neeche dikhate hain. */
  const billableTasks = tasks.filter(t => isTaskBillable(t.status)
    && ((Number(t.fee_agreed) || 0) - (Number(t.amount_paid) || 0)) > 0);
  const linkedTasks = billableTasks.filter(t => t.client_id);
  const looseTasks = billableTasks.filter(t => !t.client_id);
  const taskLeft = (t: typeof tasks[number]) => (Number(t.fee_agreed) || 0) - (Number(t.amount_paid) || 0);
  const loosePending = looseTasks.reduce((a, t) => a + taskLeft(t), 0);
  const workflowPending = billableTasks.reduce((a, t) => a + taskLeft(t), 0);
  const looseCollected = tasks.filter(t => !t.client_id).reduce((a, t) => a + (Number(t.amount_paid) || 0), 0);

  const pending = clientPending + loosePending;
  const collectedAll = collected + looseCollected;

  /* Is MAHINE ka collected (pure saalo ka nahi). Client payments ki paid_on
     date se — is mahine jo paisa aaya. (firm_paid advance isme nahi.) */
  const _now = new Date();
  const _thisMonth = (ds?: string | null) => {
    if (!ds) return false;
    const d = new Date(ds);
    return !isNaN(d.getTime()) && d.getFullYear() === _now.getFullYear() && d.getMonth() === _now.getMonth();
  };
  const collectedThisMonth = payments
    .filter(p => (p.kind || "client") !== "firm_paid" && _thisMonth(p.paid_on))
    .reduce((a, p) => a + (Number(p.amount) || 0), 0);

  return (
    <div className="h-full overflow-y-auto bg-[#F6F5F1] p-5 md:p-7">
      <PageHead title="Payments" sub="Ledger apne aap ban-ta hai — nil/sales rates aur har period se" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <Metric label="Is month collected" value={money(collectedThisMonth)} tone="good" />
        <Metric label="Total pending" value={money(pending)} tone="danger" />
        <Metric label="Clients with balance" value={withBal} />
        <Metric label="Workflow kaam ka" value={money(workflowPending)}
          sub={looseTasks.length ? `${looseTasks.length} walk-in bhi isme` : undefined} />
      </div>

      <div className="flex gap-1.5 mb-4 flex-wrap">
        {([["pending", `Pending ${recent.length}`], ["call", `Call list · ${CALL_AFTER_DAYS}+ din ${callList.length}`]] as ["pending" | "call", string][]).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-medium border ${tab === k ? "bg-[#1C1E1B] text-white border-[#1C1E1B]" : "bg-white text-[#6B6F68] border-[#E6E4DD]"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "call" && (
        <div className="text-[12px] text-[#7A4A12] bg-[#FFF6E8] border border-[#F2DFBE] rounded-lg px-3.5 py-2.5 mb-3">
          {CALL_AFTER_DAYS}+ din se payment nahi aaya — inhe direct call karo. (Reminder cadence khatam ho chuki.)
        </div>
      )}

      <Panel>
        <div className="hidden md:block">
          <Scroller>
            <thead><tr><Th>Client</Th><Th>Current cycle</Th><Th>Total paid</Th><Th>Balance due</Th><Th>Pending since</Th><Th /></tr></thead>
            <tbody>
              {loading && <EmptyRow colSpan={6}>Load ho raha hai...</EmptyRow>}
              {!loading && !rows.length && <EmptyRow colSpan={6}>{tab === "call" ? "Koi 14+ din ka pending nahi." : "Koi pending client nahi."}</EmptyRow>}
              {rows.map(({ c, bal, days }) => {
                const cyc = currentCycle(c);
                return (
                  <tr key={c.id} className="hover:bg-[#FBFAF7]">
                    <Td><div className="flex items-center gap-2.5"><Avatar name={c.name} onClick={() => setOpen(c)} /><span className="font-medium cursor-pointer" onClick={() => setOpen(c)}>{c.name}</span></div></Td>
                    <Td><Pill status={cyc === "quarterly" ? "" : "Completed"}>{cyc === "quarterly" ? "Quarterly" : "Monthly"}</Pill></Td>
                    <Td className="font-mono text-[#9BA098]">{money(totalPaid(c, payments, tasks))}</Td>
                    <Td className={`font-mono font-semibold ${bal > 0 ? "text-[#A32D2D]" : "text-[#0F6E56]"}`}>{bal > 0 ? money(bal) : "Clear"}</Td>
                    <Td className={`text-[12px] whitespace-nowrap ${days >= CALL_AFTER_DAYS ? "text-[#A32D2D] font-semibold" : "text-[#6B6F68]"}`}>{days > 0 ? `${days} din` : "—"}</Td>
                    <Td>
                      {c.mobile
                        ? <a href={`tel:+91${c.mobile}`} className="inline-flex px-2.5 py-1 text-[12px] font-medium rounded-md border border-[#E6E4DD] bg-white mr-1.5">Call</a>
                        : null}
                      <Btn size="sm" onClick={() => setOpen(c)}>Record payment</Btn>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Scroller>
        </div>

        <div className="md:hidden">
          {!rows.length && <div className="px-4 py-5 text-[12.5px] text-[#9BA098]">{tab === "call" ? "Koi 14+ din ka pending nahi." : "Koi pending client nahi."}</div>}
          {rows.map(({ c, bal, days }) => (
            <div key={c.id} onClick={() => setOpen(c)} className="flex items-center gap-3 px-4 py-3 border-b border-[#E6E4DD] last:border-0 active:bg-[#FBFAF7]">
              <Avatar name={c.name} size={38} />
              <div className="flex-1 min-w-0"><div className="font-medium text-[13.5px] truncate">{c.name}</div>
                <div className="text-[11.5px] text-[#6B6F68]">Paid {money(totalPaid(c, payments, tasks))}{days > 0 ? ` · ${days} din se ruka` : ""}</div></div>
              <div className={`font-mono text-[12px] font-semibold ${bal > 0 ? "text-[#A32D2D]" : "text-[#0F6E56]"}`}>{bal > 0 ? money(bal) : "Clear"}</div>
            </div>
          ))}
        </div>
      </Panel>

      {!!billableTasks.length && (
        <div className="mt-5">
          <Panel head={<>
            <h3 className="text-[13.5px] font-semibold">
              Workflow kaam <span className="text-[#9BA098] font-normal">({billableTasks.length})</span>
            </h3>
            <div className="text-[11.5px] text-[#9BA098]">
              Amount Workflow tab se badalta hai
            </div>
          </>}>
            <div className="hidden md:block">
              <Scroller>
                <thead><tr><Th>Kaam</Th><Th>Client</Th><Th>Status</Th><Th>Agreed</Th><Th>Paid</Th><Th>Baaki</Th></tr></thead>
                <tbody>
                  {[...linkedTasks, ...looseTasks].map(t => {
                    const c = t.client_id ? clients.find(x => x.id === t.client_id) : null;
                    const b = taskLeft(t);
                    return (
                      <tr key={t.id} className="hover:bg-[#FBFAF7]">
                        <Td className="font-medium">{t.name}
                          {t.category && <span className="text-[11.5px] text-[#9BA098] font-normal"> · {t.category}</span>}
                        </Td>
                        <Td>
                          {c ? <span className="cursor-pointer" onClick={() => setOpen(c)}>{c.name}</span>
                             : <span className="text-[#A35A17] text-[12px]">walk-in — kisi client se juda nahi</span>}
                        </Td>
                        <Td><Pill status={t.status}>{t.status}</Pill></Td>
                        <Td className="font-mono">{money(Number(t.fee_agreed) || 0)}</Td>
                        <Td className="font-mono text-[#9BA098]">{money(Number(t.amount_paid) || 0)}</Td>
                        <Td className="font-mono font-semibold text-[#A32D2D]">{money(b)}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Scroller>
            </div>

            <div className="md:hidden">
              {[...linkedTasks, ...looseTasks].map(t => {
                const c = t.client_id ? clients.find(x => x.id === t.client_id) : null;
                return (
                  <div key={t.id} className="px-4 py-3 border-b border-[#E6E4DD] last:border-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-[13.5px] truncate">{t.name}</div>
                        <div className="text-[11.5px] text-[#6B6F68]">
                          {c ? c.name : "walk-in"} · {t.status}
                        </div>
                      </div>
                      <span className="font-mono text-[12px] font-semibold text-[#A32D2D]">{money(taskLeft(t))}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          {!!looseTasks.length && (
            <div className="flex items-start gap-2 text-[12px] text-[#7A4A12] bg-[#FFF6E8] border border-[#F2DFBE] rounded-lg px-3.5 py-2.5 mt-2.5">
              <div>
                <b>{looseTasks.length} kaam kisi client se jude nahi hain</b> ({money(loosePending)}).
                Ye kisi ke balance me nahi dikhte — sirf yahan. Workflow tab me jaake
                "Kisi client se jodo" set kar do, to client ke ledger me bhi aa jayenge
                aur bot bhi unka hisaab bata payega.
              </div>
            </div>
          )}
        </div>
      )}

      {open && <ClientDrawer client={clients.find(c => c.id === open.id) || open} onClose={() => setOpen(null)} />}
      <div className="h-8" />
    </div>
  );
}
