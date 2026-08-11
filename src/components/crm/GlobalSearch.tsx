/* Global search — clients, tasks, registrations sab me ek saath */
import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { useCrm } from "../../services/crmStore";
import type { Client } from "../../services/crmLogic";

interface Props { onPickClient: (c: Client) => void; onGoto: (tab: string) => void; dark?: boolean; }

export default function GlobalSearch({ onPickClient, onGoto, dark }: Props) {
  const { clients, tasks, registrations } = useCrm();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const out: Array<{ t: string; sub: string; run: () => void }> = [];
    clients.forEach(c => {
      if (c.name.toLowerCase().includes(s) || (c.business_name || "").toLowerCase().includes(s) ||
        (c.gstin || "").toLowerCase().includes(s) || (c.portal_username || "").toLowerCase().includes(s) || (c.mobile || "").includes(s))
        out.push({ t: c.name, sub: `Client · ${c.business_name || c.mobile}`, run: () => onPickClient(c) });
    });
    tasks.forEach(t => {
      if (t.name.toLowerCase().includes(s) || (t.category || "").toLowerCase().includes(s))
        out.push({ t: t.name, sub: `Workflow · ${t.category || "Other"}`, run: () => onGoto("workflow") });
    });
    registrations.forEach(r => {
      if (r.name.toLowerCase().includes(s) || (r.trn || "").toLowerCase().includes(s))
        out.push({ t: r.name, sub: `Registration · ${r.status}`, run: () => onGoto("registrations") });
    });
    return out.slice(0, 10);
  }, [q, clients, tasks, registrations, onPickClient, onGoto]);

  return (
    <div className="relative">
      <Search className={`absolute left-2.5 top-2.5 w-[15px] h-[15px] ${dark ? "text-[#AEB8C4]" : "text-[#9BA098]"}`} />
      <input
        value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        placeholder="Search everywhere..."
        className={`w-full pl-8 pr-3 py-2 rounded-lg text-[12.5px] outline-none border ${dark
          ? "bg-[#232F3C] border-white/10 text-white placeholder:text-[#AEB8C4] focus:border-[#0F6E56]"
          : "bg-white border-[#E6E4DD] focus:border-[#0F6E56]"}`} />
      {open && q && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-2xl p-1.5 z-50 max-h-80 overflow-y-auto min-w-[240px]">
            {results.length ? results.map((r, i) => (
              <div key={i} onClick={() => { r.run(); setQ(""); setOpen(false); }}
                className="px-2.5 py-2 rounded-md cursor-pointer hover:bg-[#F6F5F1]">
                <div className="text-[13px] font-medium text-[#1C1E1B]">{r.t}</div>
                <div className="text-[11px] text-[#6B6F68]">{r.sub}</div>
              </div>
            )) : <div className="px-2.5 py-2 text-[12px] text-[#9BA098]">Kuch nahi mila.</div>}
          </div>
        </>
      )}
    </div>
  );
}
