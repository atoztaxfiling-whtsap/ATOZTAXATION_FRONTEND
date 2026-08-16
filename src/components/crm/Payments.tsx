/* Payments — collected / pending / balance wale clients */
import { useState } from "react";
import { useCrm } from "../../services/crmStore";
import { balanceDue, totalPaid, currentCycle, money, isTaskBillable, type Client } from "../../services/crmLogic";
import { Avatar, Pill, Panel, PageHead, Metric, Btn, Scroller, Th, Td, EmptyRow } from "./ui";
import ClientDrawer from "./ClientDrawer";

export default function Payments() {
  const { clients, filingMap, payments, tasks, loading } = useCrm();
  const [open, setOpen] = useState<Client | null>(null);

  const collected = clients.reduce((a, c) => a + totalPaid(c, payments, tasks), 0);
  const clientPending = clients.reduce((a, c) => a + balanceDue(c, filingMap, payments, tasks), 0);
  const withBal = clients.filter(c => balanceDue(c, filingMap, payments, tasks) > 0).length;
  const rows = clients.slice().sort((a, b) => balanceDue(b, filingMap, payments, tasks) - balanceDue(a, filingMap, payments, tasks));

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

  return (
    <div className="h-full overflow-y-auto bg-[#F6F5F1] p-5 md:p-7">
      <PageHead title="Payments" sub="Ledger apne aap ban-ta hai — nil/sales rates aur har period se" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <Metric label="Total collected" value={money(collectedAll)} tone="good" />
        <Metric label="Total pending" value={money(pending)} tone="danger" />
        <Metric label="Clients with balance" value={withBal} />
        <Metric label="Workflow kaam ka" value={money(workflowPending)}
          sub={looseTasks.length ? `${looseTasks.length} walk-in bhi isme` : undefined} />
      </div>

      <Panel>
        <div className="hidden md:block">
          <Scroller>
            <thead><tr><Th>Client</Th><Th>Current cycle</Th><Th>Total paid</Th><Th>Balance due</Th><Th /></tr></thead>
            <tbody>
              {loading && <EmptyRow colSpan={5}>Load ho raha hai...</EmptyRow>}
              {!loading && !rows.length && <EmptyRow colSpan={5}>Koi client nahi.</EmptyRow>}
              {rows.map(c => {
                const bal = balanceDue(c, filingMap, payments, tasks); const cyc = currentCycle(c);
                return (
                  <tr key={c.id} className="hover:bg-[#FBFAF7]">
                    <Td><div className="flex items-center gap-2.5"><Avatar name={c.name} onClick={() => setOpen(c)} /><span className="font-medium cursor-pointer" onClick={() => setOpen(c)}>{c.name}</span></div></Td>
                    <Td><Pill status={cyc === "quarterly" ? "" : "Completed"}>{cyc === "quarterly" ? "Quarterly" : "Monthly"}</Pill></Td>
                    <Td className="font-mono text-[#9BA098]">{money(totalPaid(c, payments, tasks))}</Td>
                    <Td className={`font-mono font-semibold ${bal > 0 ? "text-[#A32D2D]" : "text-[#0F6E56]"}`}>{bal > 0 ? money(bal) : "Clear"}</Td>
                    <Td><Btn size="sm" onClick={() => setOpen(c)}>Record payment</Btn></Td>
                  </tr>
                );
              })}
            </tbody>
          </Scroller>
        </div>

        <div className="md:hidden">
          {rows.map(c => {
            const bal = balanceDue(c, filingMap, payments, tasks);
            return (
              <div key={c.id} onClick={() => setOpen(c)} className="flex items-center gap-3 px-4 py-3 border-b border-[#E6E4DD] last:border-0 active:bg-[#FBFAF7]">
                <Avatar name={c.name} size={38} />
                <div className="flex-1 min-w-0"><div className="font-medium text-[13.5px] truncate">{c.name}</div>
                  <div className="text-[11.5px] text-[#6B6F68]">Paid {money(totalPaid(c, payments, tasks))}</div></div>
                <div className={`font-mono text-[12px] font-semibold ${bal > 0 ? "text-[#A32D2D]" : "text-[#0F6E56]"}`}>{bal > 0 ? money(bal) : "Clear"}</div>
              </div>
            );
          })}
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
