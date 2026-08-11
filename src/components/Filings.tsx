/* Filings — Quarterly / Monthly / Defaulters, period chooser, multi-status filter,
   inline type + amount + status + comment (demo ka dil) */
import { useState, useMemo } from "react";
import { Pencil, ChevronDown } from "lucide-react";
import { useCrm } from "../../services/crmStore";
import { upsertFiling } from "../../services/crmApi";
import {
  FILING_STATUSES, clientPeriods, currentPeriod, filingEntry, periodFee, isDefaulter,
  globalQuarterPeriods, globalMonthPeriods, findClientPeriod, TEMPLATES, waLink, money,
  type Client, type Period,
} from "../../services/crmLogic";
import { Avatar, Panel, PageHead, Btn, Scroller, Th, Td, EmptyRow, SelectInput, Modal, Field, TextInput, inlineSelect, inlineInput, Pill } from "./ui";
import ClientDrawer from "./ClientDrawer";

type Tab = "quarterly" | "monthly" | "defaulters";

export default function Filings() {
  const { clients, filingMap, staff, reload, loading, toast } = useCrm();
  const [tab, setTab] = useState<Tab>("quarterly");
  const [qPeriod, setQPeriod] = useState("current");
  const [mPeriod, setMPeriod] = useState("current");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [assigned, setAssigned] = useState("");
  const [sort, setSort] = useState("name");
  const [open, setOpen] = useState<Client | null>(null);
  const [amtEdit, setAmtEdit] = useState<{ c: Client; p: Period } | null>(null);
  const [bulk, setBulk] = useState(false);
  const [msOpen, setMsOpen] = useState(false);

  const qPeriods = useMemo(() => globalQuarterPeriods(clients), [clients]);
  const mPeriods = useMemo(() => globalMonthPeriods(clients), [clients]);

  function resolve(c: Client, sel: string, cycle: string): Period | null {
    if (sel === "current") { const p = currentPeriod(c); return p && p.cycle === cycle ? p : null; }
    const p = findClientPeriod(c, sel);
    return p && p.cycle === cycle ? p : null;
  }

  const qList = clients.map(c => ({ c, cp: resolve(c, qPeriod, "quarterly") })).filter(x => x.cp) as { c: Client; cp: Period }[];
  const mList = clients.map(c => ({ c, cp: resolve(c, mPeriod, "monthly") })).filter(x => x.cp) as { c: Client; cp: Period }[];
  const defaulters = clients.filter(c => isDefaulter(c, filingMap));

  function applyFilters(list: { c: Client; cp: Period }[]) {
    let out = list.filter(x => {
      const e = filingEntry(filingMap, x.c.id, x.cp.key);
      return (statuses.length === 0 || statuses.includes(e.status)) && (!assigned || x.c.assigned_to === assigned);
    });
    if (sort === "name") out = out.slice().sort((a, b) => a.c.name.localeCompare(b.c.name));
    else out = out.slice().sort((a, b) => filingEntry(filingMap, a.c.id, a.cp.key).status.localeCompare(filingEntry(filingMap, b.c.id, b.cp.key).status));
    return out;
  }

  const shown = tab === "quarterly" ? applyFilters(qList) : tab === "monthly" ? applyFilters(mList) : [];

  async function patch(c: Client, p: Period, field: string, value: any) {
    try { await upsertFiling({ client_id: c.id, period_key: p.key, [field]: value } as any); await reload(); }
    catch (e) { alert((e as Error).message); }
  }

  const periods = tab === "quarterly" ? qPeriods : mPeriods;
  const sel = tab === "quarterly" ? qPeriod : mPeriod;
  const setSel = tab === "quarterly" ? setQPeriod : setMPeriod;

  return (
    <div className="h-full overflow-y-auto bg-[#F6F5F1] p-5 md:p-7">
      <PageHead title="Filings" sub="Naye periods apne aap 'Yet to Pick' me aa jaate hain" />

      <div className="flex gap-1.5 mb-4 flex-wrap">
        {([["quarterly", `Quarterly ${qList.length}`], ["monthly", `Monthly ${mList.length}`], ["defaulters", `Defaulters (3+ qtr) ${defaulters.length}`]] as [Tab, string][]).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-medium border ${tab === k ? "bg-[#1C1E1B] text-white border-[#1C1E1B]" : "bg-white text-[#6B6F68] border-[#E6E4DD]"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab !== "defaulters" ? (
        <Panel head={<>
          <h3 className="text-[13.5px] font-semibold">{tab === "quarterly" ? "Quarterly" : "Monthly"} clients</h3>
          <div className="flex gap-2 flex-wrap items-center">
            <SelectInput value={sel} onChange={e => setSel(e.target.value)} className="!w-auto !text-[12.5px] !py-1.5">
              <option value="current">Current period</option>
              {periods.slice().reverse().map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </SelectInput>

            <div className="relative">
              <button onClick={() => setMsOpen(v => !v)}
                className="px-2.5 py-1.5 border border-[#E6E4DD] rounded-lg bg-white text-[12.5px] text-[#6B6F68] flex items-center gap-1.5">
                {statuses.length === 0 ? "All statuses" : statuses.length === 1 ? statuses[0] : `${statuses.length} statuses`}
                <ChevronDown className="w-3 h-3" />
              </button>
              {msOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setMsOpen(false)} />
                  <div className="absolute top-full left-0 mt-1 bg-white border border-[#E6E4DD] rounded-lg shadow-xl p-1.5 z-30 min-w-[210px] max-h-64 overflow-y-auto">
                    <label className="flex items-center gap-2 px-2 py-1.5 text-[12.5px] rounded-md hover:bg-[#F6F5F1] cursor-pointer border-b border-[#E6E4DD] mb-1 pb-2 font-medium">
                      <input type="checkbox" checked={statuses.length === 0} onChange={() => setStatuses([])} className="accent-[#0F6E56]" />
                      <span>All statuses</span>
                    </label>
                    {FILING_STATUSES.map(s => (
                      <label key={s} className="flex items-center gap-2 px-2 py-1.5 text-[12.5px] rounded-md hover:bg-[#F6F5F1] cursor-pointer">
                        <input type="checkbox" checked={statuses.includes(s)} className="accent-[#0F6E56]"
                          onChange={e => setStatuses(p => e.target.checked ? [...p, s] : p.filter(x => x !== s))} />
                        <span>{s}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>

            <SelectInput value={assigned} onChange={e => setAssigned(e.target.value)} className="!w-auto !text-[12.5px] !py-1.5">
              <option value="">All staff</option>{staff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </SelectInput>
            <SelectInput value={sort} onChange={e => setSort(e.target.value)} className="!w-auto !text-[12.5px] !py-1.5">
              <option value="name">Sort: name</option><option value="status">Sort: status</option>
            </SelectInput>
          </div>
        </>}>
          <Scroller>
            <thead><tr><Th>Client</Th><Th>Username</Th><Th>Period</Th><Th>Type</Th><Th>Amount</Th><Th>Status</Th><Th>Comment</Th><Th>Assigned</Th></tr></thead>
            <tbody>
              {loading && <EmptyRow colSpan={8}>Load ho raha hai...</EmptyRow>}
              {!loading && !shown.length && <EmptyRow colSpan={8}>Is period ke liye koi client nahi.</EmptyRow>}
              {shown.map(({ c, cp }) => {
                const e = filingEntry(filingMap, c.id, cp.key);
                const amt = e.fee_due != null ? e.fee_due : periodFee(c, cp, e.type);
                return (
                  <tr key={c.id} className="hover:bg-[#FBFAF7]">
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.name} onClick={() => setOpen(c)} />
                        <span className="font-medium cursor-pointer whitespace-nowrap" onClick={() => setOpen(c)}>{c.name}</span>
                      </div>
                    </Td>
                    <Td className="font-mono text-[11.5px] text-[#6B6F68]">{c.portal_username || "—"}</Td>
                    <Td className="text-[12.5px] text-[#9BA098] whitespace-nowrap">{cp.label}</Td>
                    <Td>
                      <select className={inlineSelect} value={e.type} onChange={ev => patch(c, cp, "type", ev.target.value)}>
                        <option value="nil">Nil</option><option value="sales">Sales</option>
                      </select>
                    </Td>
                    <Td className="font-mono text-[11.5px] whitespace-nowrap">
                      {money(amt)}
                      {e.fee_due != null && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#FAEEDA] text-[#412402] text-[9.5px]">custom</span>}
                      <button onClick={() => setAmtEdit({ c, p: cp })} className="ml-1 text-[#9BA098] hover:text-[#0F6E56] align-middle"><Pencil className="w-3 h-3" /></button>
                    </Td>
                    <Td>
                      <select className={inlineSelect} value={e.status} onChange={ev => patch(c, cp, "status", ev.target.value)}>
                        {FILING_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </Td>
                    <Td><input className={inlineInput} defaultValue={e.comment} placeholder="Add note" onBlur={ev => { if (ev.target.value !== e.comment) patch(c, cp, "comment", ev.target.value); }} /></Td>
                    <Td><span className="text-[12.5px] text-[#6B6F68] whitespace-nowrap">{c.assigned_to || "—"}</span></Td>
                  </tr>
                );
              })}
            </tbody>
          </Scroller>
        </Panel>
      ) : (
        <Panel head={<>
          <h3 className="text-[13.5px] font-semibold">Quarterly defaulters</h3>
          <Btn size="sm" variant="primary" onClick={() => setBulk(true)}>Send to all</Btn>
        </>}>
          <Scroller>
            <thead><tr><Th>Client</Th><Th>Username</Th><Th>Last 3 quarters</Th><Th>Assigned</Th><Th /></tr></thead>
            <tbody>
              {!defaulters.length && <EmptyRow colSpan={5}>Abhi koi defaulter nahi.</EmptyRow>}
              {defaulters.map(c => {
                const qp = clientPeriods(c).filter(p => p.cycle === "quarterly").slice(-3);
                const txt = qp.map(p => `${p.label}: ${filingEntry(filingMap, c.id, p.key).status}`).join(" · ");
                return (
                  <tr key={c.id} className="hover:bg-[#FBFAF7]">
                    <Td><div className="flex items-center gap-2.5"><Avatar name={c.name} onClick={() => setOpen(c)} /><span className="font-medium cursor-pointer" onClick={() => setOpen(c)}>{c.name}</span></div></Td>
                    <Td className="font-mono text-[11.5px] text-[#6B6F68]">{c.portal_username || "—"}</Td>
                    <Td className="text-[12.5px] text-[#9BA098]">{txt}</Td>
                    <Td><span className="text-[12.5px] text-[#6B6F68]">{c.assigned_to || "—"}</span></Td>
                    <Td>
                      <a href={waLink(c.mobile, TEMPLATES.find(t => t.id === "defaulter")!.text(c, { balance: 0, period: "" }))} target="_blank" rel="noreferrer"
                        className="inline-flex px-2.5 py-1 text-[12px] font-medium rounded-md border border-[#E6E4DD] bg-white">WhatsApp</a>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Scroller>
        </Panel>
      )}

      {amtEdit && <AmountModal edit={amtEdit} onClose={() => setAmtEdit(null)} onSaved={async () => { setAmtEdit(null); await reload(); toast("Amount update ho gaya"); }} />}
      {bulk && (
        <Modal title="Defaulters ko reminder bhejo" sub="Browser se sach me bulk nahi ja sakta — har ek pe click karo, message pehle se bhara milega." onClose={() => setBulk(false)}>
          <div className="max-h-80 overflow-y-auto">
            {defaulters.length ? defaulters.map(c => (
              <div key={c.id} className="flex items-center gap-3 py-2 border-b border-[#E6E4DD] last:border-0">
                <Avatar name={c.name} size={28} />
                <div className="flex-1 min-w-0"><div className="text-[13px] font-medium truncate">{c.name}</div><div className="text-[11.5px] text-[#6B6F68] truncate">{c.business_name || c.mobile}</div></div>
                <a href={waLink(c.mobile, TEMPLATES.find(t => t.id === "defaulter")!.text(c, { balance: 0, period: "" }))} target="_blank" rel="noreferrer"
                  className="px-2.5 py-1 text-[12px] font-medium rounded-md bg-[#1C1E1B] text-white">Send</a>
              </div>
            )) : <div className="text-[12.5px] text-[#9BA098]">Abhi koi defaulter nahi.</div>}
          </div>
        </Modal>
      )}
      {open && <ClientDrawer client={clients.find(c => c.id === open.id) || open} onClose={() => setOpen(null)} />}
      <div className="h-8" />
    </div>
  );
}

function AmountModal({ edit, onClose, onSaved }: { edit: { c: Client; p: Period }; onClose: () => void; onSaved: () => void }) {
  const { filingMap } = useCrm();
  const e = filingEntry(filingMap, edit.c.id, edit.p.key);
  const def = periodFee(edit.c, edit.p, e.type);
  const [val, setVal] = useState(e.fee_due != null ? String(e.fee_due) : String(def));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try { await upsertFiling({ client_id: edit.c.id, period_key: edit.p.key, fee_due: val === "" ? null : Number(val) }); onSaved(); }
    catch (err) { alert((err as Error).message); setSaving(false); }
  }

  return (
    <Modal title="Is period ka amount badlo" sub={`${edit.c.name} — sirf ${edit.p.label} ke liye, ${e.type === "sales" ? "sales" : "nil"} rate ko override karega`} onClose={onClose}>
      <Field label="Amount (₹)" hint={`Is period ka default rate ${money(def)} hai. Field khali karke save karoge to override hat jayega.`}>
        <TextInput type="number" value={val} onChange={ev => setVal(ev.target.value)} placeholder={String(def)} />
      </Field>
      <div className="flex gap-2 justify-end mt-4">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Btn>
      </div>
    </Modal>
  );
}
