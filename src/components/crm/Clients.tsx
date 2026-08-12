/* Clients — master list (demo jaisa table + mobile pe cards) */
import { useState, useMemo } from "react";
import { Search, Plus } from "lucide-react";
import { useCrm } from "../../services/crmStore";
import { balanceDue, currentCycle, rateFor, money, type Client } from "../../services/crmLogic";
import { Avatar, Pill, Panel, PageHead, Btn, Scroller, Th, Td, EmptyRow, SelectInput } from "./ui";
import ClientDrawer from "./ClientDrawer";
import ClientForm from "./ClientForm";

export default function Clients() {
  const { clients, staff, filingMap, payments, tasks, loading } = useCrm();
  const [q, setQ] = useState("");
  const [fa, setFa] = useState("");
  const [fc, setFc] = useState("");
  const [onlyNew, setOnlyNew] = useState(false);
  const [open, setOpen] = useState<Client | null>(null);
  const [adding, setAdding] = useState(false);

  const rows = useMemo(() => {
    const s = q.toLowerCase();
    return clients.filter(c =>
      (!s || c.name.toLowerCase().includes(s) || (c.gstin || "").toLowerCase().includes(s) ||
        (c.portal_username || "").toLowerCase().includes(s) || (c.mobile || "").includes(s) ||
        (c.business_name || "").toLowerCase().includes(s)) &&
      (!fa || c.assigned_to === fa) && (!fc || currentCycle(c) === fc) &&
      (!onlyNew || (c.source === "whatsapp" && !c.fee_quarterly_sales && !c.fee_monthly_sales))
    );
  }, [clients, q, fa, fc, onlyNew]);

  return (
    <div className="h-full overflow-y-auto bg-[#F6F5F1] p-5 md:p-7">
      <PageHead title="Clients" sub="Master list — sab clients ek jagah"
        actions={<>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-[15px] h-[15px] text-[#9BA098]" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, GSTIN, username"
              className="w-full sm:w-56 pl-8 pr-3 py-2 border border-[#E6E4DD] rounded-lg text-[13px] outline-none focus:border-[#0F6E56] bg-white" />
          </div>
          <Btn variant="primary" onClick={() => setAdding(true)}><Plus className="w-3.5 h-3.5" />Add client</Btn>
        </>} />

      <Panel head={<>
        <h3 className="text-[13.5px] font-semibold">All clients <span className="text-[#9BA098] font-normal">({rows.length})</span></h3>
        <div className="flex gap-2 flex-wrap">
          <SelectInput value={fa} onChange={e => setFa(e.target.value)} className="!w-auto !text-[12.5px] !py-1.5">
            <option value="">All staff</option>{staff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </SelectInput>
          <SelectInput value={fc} onChange={e => setFc(e.target.value)} className="!w-auto !text-[12.5px] !py-1.5">
            <option value="">All cycles</option><option value="quarterly">Quarterly now</option><option value="monthly">Monthly now</option>
          </SelectInput>
          <button onClick={() => setOnlyNew(v => !v)}
            className={`px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium border ${onlyNew ? "bg-[#1C1E1B] text-white border-[#1C1E1B]" : "bg-white text-[#6B6F68] border-[#E6E4DD]"}`}>
            Naye WhatsApp numbers
          </button>
        </div>
      </>}>
        {/* Desktop table */}
        <div className="hidden md:block">
          <Scroller>
            <thead><tr><Th>Client</Th><Th>Username</Th><Th>Current cycle</Th><Th>Rates (nil / sales)</Th><Th>Assigned</Th><Th>Balance due</Th><Th /></tr></thead>
            <tbody>
              {loading && <EmptyRow colSpan={7}>Load ho raha hai...</EmptyRow>}
              {!loading && !rows.length && <EmptyRow colSpan={7}>Koi client nahi mila.</EmptyRow>}
              {rows.map(c => {
                const bal = balanceDue(c, filingMap, payments, tasks); const cyc = currentCycle(c);
                return (
                  <tr key={c.id} className="hover:bg-[#FBFAF7]">
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.name} onClick={() => setOpen(c)} />
                        <div><div className="font-medium cursor-pointer flex items-center gap-1.5" onClick={() => setOpen(c)}>
                            {c.name}
                            {c.source === "whatsapp" && !c.fee_quarterly_sales && !c.fee_monthly_sales &&
                              <span className="px-1.5 py-0.5 rounded-full bg-[#FAEEDA] text-[#412402] text-[9.5px] font-bold">NAYA</span>}
                          </div>
                          <div className="font-mono text-[11.5px] text-[#9BA098]">{c.gstin || "—"}</div></div>
                      </div>
                    </Td>
                    <Td className="font-mono text-[11.5px] text-[#6B6F68]">{c.portal_username || "—"}</Td>
                    <Td><Pill status={cyc === "quarterly" ? "" : "Completed"}>{cyc === "quarterly" ? "Quarterly" : "Monthly"}</Pill></Td>
                    <Td className="font-mono text-[11.5px] text-[#9BA098] whitespace-nowrap">{money(rateFor(c, cyc, "nil"))} / {money(rateFor(c, cyc, "sales"))}</Td>
                    <Td><span className="text-[12.5px] text-[#6B6F68] whitespace-nowrap">{c.assigned_to || "—"}</span></Td>
                    <Td className={`font-mono font-semibold ${bal > 0 ? "text-[#A32D2D]" : "text-[#0F6E56]"}`}>{bal > 0 ? money(bal) : "Clear"}</Td>
                    <Td><Btn size="sm" onClick={() => setOpen(c)}>View</Btn></Td>
                  </tr>
                );
              })}
            </tbody>
          </Scroller>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden">
          {loading && <div className="p-5 text-[12.5px] text-[#9BA098]">Load ho raha hai...</div>}
          {!loading && !rows.length && <div className="p-5 text-[12.5px] text-[#9BA098]">Koi client nahi mila.</div>}
          {rows.map(c => {
            const bal = balanceDue(c, filingMap, payments, tasks); const cyc = currentCycle(c);
            return (
              <div key={c.id} onClick={() => setOpen(c)} className="flex items-center gap-3 px-4 py-3 border-b border-[#E6E4DD] last:border-0 active:bg-[#FBFAF7]">
                <Avatar name={c.name} size={38} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[13.5px] truncate">{c.name}</div>
                  <div className="text-[11.5px] text-[#6B6F68] truncate">{c.mobile} · {c.assigned_to || "—"} · {cyc === "quarterly" ? "Qtr" : "Mon"}</div>
                </div>
                <div className={`font-mono text-[12px] font-semibold flex-shrink-0 ${bal > 0 ? "text-[#A32D2D]" : "text-[#0F6E56]"}`}>{bal > 0 ? money(bal) : "Clear"}</div>
              </div>
            );
          })}
        </div>
      </Panel>

      {open && <ClientDrawer client={clients.find(c => c.id === open.id) || open} onClose={() => setOpen(null)} />}
      {adding && <ClientForm onClose={() => setAdding(false)} />}
    </div>
  );
}
