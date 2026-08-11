/* Payments — collected / pending / balance wale clients */
import { useState } from "react";
import { useCrm } from "../../services/crmStore";
import { balanceDue, totalPaid, currentCycle, money, type Client } from "../../services/crmLogic";
import { Avatar, Pill, Panel, PageHead, Metric, Btn, Scroller, Th, Td, EmptyRow } from "./ui";
import ClientDrawer from "./ClientDrawer";

export default function Payments() {
  const { clients, filingMap, payments, tasks, loading } = useCrm();
  const [open, setOpen] = useState<Client | null>(null);

  const collected = clients.reduce((a, c) => a + totalPaid(c, payments, tasks), 0);
  const pending = clients.reduce((a, c) => a + balanceDue(c, filingMap, payments, tasks), 0);
  const withBal = clients.filter(c => balanceDue(c, filingMap, payments, tasks) > 0).length;
  const rows = clients.slice().sort((a, b) => balanceDue(b, filingMap, payments, tasks) - balanceDue(a, filingMap, payments, tasks));

  return (
    <div className="h-full overflow-y-auto bg-[#F6F5F1] p-5 md:p-7">
      <PageHead title="Payments" sub="Ledger apne aap ban-ta hai — nil/sales rates aur har period se" />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 mb-5">
        <Metric label="Total collected" value={money(collected)} tone="good" />
        <Metric label="Total pending" value={money(pending)} tone="danger" />
        <Metric label="Clients with balance" value={withBal} />
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

      {open && <ClientDrawer client={clients.find(c => c.id === open.id) || open} onClose={() => setOpen(null)} />}
      <div className="h-8" />
    </div>
  );
}
