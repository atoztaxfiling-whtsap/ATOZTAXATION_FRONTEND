import { useEffect, useState, useCallback } from "react";
import { Plus, X } from "lucide-react";
import {
  fetchCrmRegistrations, createCrmRegistration, updateCrmRegistration, deleteCrmRegistration,
  convertRegistration, fetchCrmStaff, fetchCrmServices, type CrmRegistration, type CrmStaff, type CrmService,
} from "../services/api";

function initials(name: string) { return (name || "?").trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase(); }
function statusCls(s: string) {
  if (s === "Completed") return "bg-green-50 text-green-700";
  if (s === "Closed Lost") return "bg-red-50 text-red-600";
  return "bg-amber-50 text-amber-700";
}

const STATUSES = ["Docs Pending", "Query Raised", "ARN Generated", "Department Approval", "Completed", "Closed Lost"];

export default function Registrations({ onBack }: { onBack?: () => void }) {
  const [rows, setRows] = useState<CrmRegistration[]>([]);
  const [staff, setStaff] = useState<CrmStaff[]>([]);
  const [services, setServices] = useState<CrmService[]>([]);
  const [loading, setLoading] = useState(false);

  const [sheet, setSheet] = useState<"closed" | "add" | "detail" | "convert">("closed");
  const [selected, setSelected] = useState<CrmRegistration | null>(null);
  const [form, setForm] = useState({ name: "", mobile: "", business_name: "", assigned_to: "" });
  const [convertForm, setConvertForm] = useState({ mobile: "", assigned_to: "", primary_service: "GST Registration" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, s, sv] = await Promise.all([fetchCrmRegistrations(), fetchCrmStaff(), fetchCrmServices()]);
      setRows(r); setStaff(s); setServices(sv);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function openAdd() { setForm({ name: "", mobile: "", business_name: "", assigned_to: "" }); setSheet("add"); }
  function openDetail(r: CrmRegistration) { setSelected(r); setSheet("detail"); }
  function close() { setSheet("closed"); }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    try { await createCrmRegistration(form); close(); await load(); }
    catch (e) { alert("Save nahi hua: " + (e as Error).message); }
    finally { setSaving(false); }
  }

  async function setStatus(status: string) {
    if (!selected) return;
    const row = await updateCrmRegistration(selected.id, { status });
    setSelected(row); await load();
  }

  async function remove() {
    if (!selected) return;
    if (!confirm(`${selected.name} ki registration delete karni hai?`)) return;
    await deleteCrmRegistration(selected.id); close(); await load();
  }

  function openConvert() {
    if (!selected) return;
    setConvertForm({ mobile: selected.mobile || "", assigned_to: selected.assigned_to || "", primary_service: "GST Registration" });
    setSheet("convert");
  }

  async function doConvert() {
    if (!selected || !/^[6-9]\d{9}$/.test(convertForm.mobile)) { alert("Sahi 10-digit mobile chahiye"); return; }
    setSaving(true);
    try { await convertRegistration(selected.id, convertForm); close(); await load(); }
    catch (e) { alert("Convert nahi hua: " + (e as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <div className="h-full overflow-y-auto bg-[#F2F5F1] relative pb-24">
      <div className="bg-[#FBFBF9] px-5 pt-5 pb-3 sticky top-0 z-10 border-b border-[#E6E7E2] flex items-center gap-2">
        {onBack && <button onClick={onBack} className="text-green-700 font-semibold text-sm mr-1">‹ More</button>}
        <div><h2 className="serif text-xl font-semibold text-[#15191E]">Registrations</h2><p className="text-xs text-slate-500">Naye GST case — complete hote hi client banao</p></div>
      </div>

      <div className="px-4 pt-3">
        {loading ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-9 w-9 border-b-2 border-green-600" /></div> :
          rows.length === 0 ? <div className="text-center py-16 text-slate-500">Koi registration nahi hai</div> :
          <div className="space-y-2">
            {rows.map(r => (
              <div key={r.id} onClick={() => openDetail(r)} className="flex items-center gap-3 bg-white border border-[#E6E7E2] rounded-2xl p-3.5 cursor-pointer active:bg-[#F2F5F1]">
                <div className="w-11 h-11 rounded-full bg-[#E7F2EC] text-[#0C5C40] flex items-center justify-center serif font-semibold flex-shrink-0">{initials(r.name)}</div>
                <div className="flex-1 min-w-0"><div className="font-semibold text-sm">{r.name}</div><div className="text-xs text-slate-500 truncate">{r.assigned_to || "—"}{r.trn ? ` · TRN ${r.trn}` : ""}</div></div>
                {r.converted_client_id ? <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-green-50 text-green-700 flex-shrink-0">Client bana</span>
                  : <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${statusCls(r.status)}`}>{r.status}</span>}
              </div>
            ))}
          </div>}
      </div>
      <button onClick={openAdd} className="fixed bottom-24 right-5 md:bottom-8 md:right-8 w-14 h-14 rounded-full bg-green-700 text-white flex items-center justify-center shadow-lg shadow-green-900/30 active:scale-95 z-20"><Plus className="w-6 h-6" /></button>

      {sheet !== "closed" && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-end sm:items-center justify-center" onClick={close}>
          {sheet === "add" && (
            <div onClick={e => e.stopPropagation()} className="bg-[#FBFBF9] w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 pb-8 sm:pb-6 max-h-[85%] overflow-y-auto">
              <div className="w-9 h-1 bg-slate-300 rounded-full mx-auto mb-4 sm:hidden" />
              <h3 className="serif text-xl font-semibold mb-4">Nayi Registration</h3>
              <div className="space-y-3">
                <div><label className="text-xs font-semibold text-slate-500 block mb-1">Naam *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border border-[#E6E7E2] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-600" /></div>
                <div className="flex gap-3">
                  <div className="flex-1"><label className="text-xs font-semibold text-slate-500 block mb-1">Mobile</label><input value={form.mobile} maxLength={10} onChange={e => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "") })} className="w-full border border-[#E6E7E2] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-600" /></div>
                  <div className="flex-1"><label className="text-xs font-semibold text-slate-500 block mb-1">Business</label><input value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} className="w-full border border-[#E6E7E2] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-600" /></div>
                </div>
                <div><label className="text-xs font-semibold text-slate-500 block mb-1">Kisko diya</label>
                  <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} className="w-full border border-[#E6E7E2] rounded-xl px-3 py-2.5 text-sm bg-white">
                    <option value="">Select karo</option>{staff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={close} className="flex-1 py-3 rounded-xl bg-[#F2F5F1] border border-[#E6E7E2] font-semibold text-sm">Cancel</button>
                <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl bg-green-700 text-white font-semibold text-sm disabled:opacity-60">{saving ? "Save ho raha..." : "Save Karo"}</button>
              </div>
            </div>
          )}

          {sheet === "detail" && selected && (
            <div onClick={e => e.stopPropagation()} className="bg-[#FBFBF9] w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 pb-8 sm:pb-6 max-h-[88%] overflow-y-auto">
              <div className="w-9 h-1 bg-slate-300 rounded-full mx-auto mb-4 sm:hidden" />
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#E7F2EC] text-[#0C5C40] flex items-center justify-center serif font-semibold">{initials(selected.name)}</div>
                  <div><div className="font-bold">{selected.name}</div><div className="text-xs text-slate-500">{selected.business_name || selected.mobile || "—"}</div></div>
                </div>
                <button onClick={close}><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              {selected.converted_client_id ? (
                <div className="bg-green-50 text-green-700 text-sm rounded-xl px-4 py-3 mb-4 font-semibold">Ye already client ban chuka hai ✓</div>
              ) : (
                <>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Status</div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {STATUSES.map(s => (
                      <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${selected.status === s ? "bg-[#15191E] text-white border-[#15191E]" : "bg-white text-slate-600 border-[#E6E7E2]"}`}>{s}</button>
                    ))}
                  </div>
                  <button onClick={openConvert} className="w-full py-3 rounded-xl bg-green-700 text-white font-semibold text-sm mb-3">Client Banao</button>
                </>
              )}
              <button onClick={remove} className="w-full py-3 rounded-xl bg-red-50 text-red-600 font-semibold text-sm">Delete Karo</button>
            </div>
          )}

          {sheet === "convert" && selected && (
            <div onClick={e => e.stopPropagation()} className="bg-[#FBFBF9] w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 pb-8 sm:pb-6 max-h-[85%] overflow-y-auto">
              <div className="w-9 h-1 bg-slate-300 rounded-full mx-auto mb-4 sm:hidden" />
              <h3 className="serif text-xl font-semibold mb-1">Client Banao</h3>
              <p className="text-xs text-slate-500 mb-4">{selected.name} — filing details set karo</p>
              <div className="space-y-3">
                <div><label className="text-xs font-semibold text-slate-500 block mb-1">Mobile *</label><input value={convertForm.mobile} maxLength={10} onChange={e => setConvertForm({ ...convertForm, mobile: e.target.value.replace(/\D/g, "") })} className="w-full border border-[#E6E7E2] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-600" /></div>
                <div><label className="text-xs font-semibold text-slate-500 block mb-1">Service</label>
                  <select value={convertForm.primary_service} onChange={e => setConvertForm({ ...convertForm, primary_service: e.target.value })} className="w-full border border-[#E6E7E2] rounded-xl px-3 py-2.5 text-sm bg-white">
                    {services.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div><label className="text-xs font-semibold text-slate-500 block mb-1">Kisko diya</label>
                  <select value={convertForm.assigned_to} onChange={e => setConvertForm({ ...convertForm, assigned_to: e.target.value })} className="w-full border border-[#E6E7E2] rounded-xl px-3 py-2.5 text-sm bg-white">
                    <option value="">Select karo</option>{staff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setSheet("detail")} className="flex-1 py-3 rounded-xl bg-[#F2F5F1] border border-[#E6E7E2] font-semibold text-sm">Peeche</button>
                <button onClick={doConvert} disabled={saving} className="flex-1 py-3 rounded-xl bg-green-700 text-white font-semibold text-sm disabled:opacity-60">{saving ? "Bana raha..." : "Confirm Karo"}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
