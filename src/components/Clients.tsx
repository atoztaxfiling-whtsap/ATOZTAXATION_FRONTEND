import { useEffect, useMemo, useState, useCallback } from "react";
import { Search, Plus, X, Phone, MessageCircle, Pencil, ChevronRight, Building2 } from "lucide-react";
import {
  fetchCrmClients, createCrmClient, updateCrmClient, deleteCrmClient, restoreCrmClient,
  fetchCrmStaff, fetchCrmServices, type CrmClient, type CrmStaff, type CrmService,
} from "../services/api";

function initials(name: string) {
  return (name || "?").trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function serviceTag(service?: string | null): { label: string; cls: string } {
  const s = (service || "").toLowerCase();
  if (s.includes("gst")) return { label: "GST", cls: "bg-green-50 text-green-700" };
  if (s.includes("itr") || s.includes("income")) return { label: "ITR", cls: "bg-amber-50 text-amber-700" };
  if (!service) return { label: "—", cls: "bg-slate-100 text-slate-500" };
  return { label: "OTHER", cls: "bg-violet-50 text-violet-700" };
}

const EMPTY_FORM = { name: "", mobile: "", business_name: "", primary_service: "", assigned_to: "" };

export default function Clients() {
  const [clients, setClients] = useState<CrmClient[]>([]);
  const [staff, setStaff] = useState<CrmStaff[]>([]);
  const [services, setServices] = useState<CrmService[]>([]);
  const [search, setSearch] = useState("");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  const [sheet, setSheet] = useState<"closed" | "add" | "edit" | "detail">("closed");
  const [selected, setSelected] = useState<CrmClient | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [toast, setToast] = useState<{ msg: string; undoId?: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, s, sv] = await Promise.all([fetchCrmClients(), fetchCrmStaff(), fetchCrmServices()]);
      setClients(c); setStaff(s); setServices(sv);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter(c => {
      if (assignedFilter !== "all" && c.assigned_to !== assignedFilter) return false;
      if (q && !(c.name?.toLowerCase().includes(q) || c.mobile?.includes(q) || c.business_name?.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [clients, search, assignedFilter]);

  function openAdd() {
    setForm(EMPTY_FORM); setErrorMsg(""); setSelected(null); setSheet("add");
  }
  function openEdit(c: CrmClient) {
    setForm({ name: c.name || "", mobile: c.mobile || "", business_name: c.business_name || "", primary_service: c.primary_service || "", assigned_to: c.assigned_to || "" });
    setErrorMsg(""); setSelected(c); setSheet("edit");
  }
  function openDetail(c: CrmClient) { setSelected(c); setSheet("detail"); }
  function closeSheet() { setSheet("closed"); setErrorMsg(""); }

  async function save() {
    if (!form.name.trim() || !/^[6-9]\d{9}$/.test(form.mobile.trim())) {
      setErrorMsg("Naam aur sahi 10-digit mobile number zaroori hai"); return;
    }
    setSaving(true); setErrorMsg("");
    try {
      if (sheet === "edit" && selected) {
        await updateCrmClient(selected.id, form);
        setToast({ msg: "Details update ho gayi" });
      } else {
        await createCrmClient({ ...form, source: "manual" });
        setToast({ msg: "Client add ho gaya" });
      }
      closeSheet();
      await load();
    } catch (e) {
      setErrorMsg((e as Error).message || "Save nahi hua, dobara try karo");
    } finally { setSaving(false); }
  }

  async function remove() {
    if (!selected) return;
    if (!confirm(`${selected.name} ko delete karna hai?`)) return;
    const id = selected.id;
    closeSheet();
    try {
      await deleteCrmClient(id);
      setClients(prev => prev.filter(c => c.id !== id));
      setToast({ msg: "Client hata diya gaya", undoId: id });
    } catch (e) { alert("Delete nahi hua: " + (e as Error).message); }
  }

  async function undo(id: string) {
    try { await restoreCrmClient(id); setToast(null); await load(); }
    catch (e) { alert("Undo nahi hua: " + (e as Error).message); }
  }

  return (
    <div className="h-full overflow-y-auto bg-[#F2F5F1] relative pb-24">
      {/* Header */}
      <div className="bg-[#FBFBF9] px-5 pt-5 pb-3 sticky top-0 z-10 border-b border-[#E6E7E2]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="serif text-2xl font-semibold text-[#15191E]">Clients</h2>
          <span className="text-xs font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full">{clients.length} total</span>
        </div>
        <div className="flex items-center gap-2 bg-[#F2F5F1] border border-[#E6E7E2] rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Naam, mobile ya business dhoondo"
            className="bg-transparent outline-none text-sm flex-1 min-w-0"
          />
        </div>
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          <button onClick={() => setAssignedFilter("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border ${assignedFilter === "all" ? "bg-green-700 text-white border-green-700" : "bg-white text-slate-600 border-[#E6E7E2]"}`}>
            Sab
          </button>
          {staff.map(s => (
            <button key={s.id} onClick={() => setAssignedFilter(s.name)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border ${assignedFilter === s.name ? "bg-green-700 text-white border-green-700" : "bg-white text-slate-600 border-[#E6E7E2]"}`}>
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="px-4 pt-3">
        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-9 w-9 border-b-2 border-green-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Koi client nahi mila</p>
          </div>
        ) : (
          <>
            <div className="text-xs font-bold tracking-wide uppercase text-slate-400 px-1 pb-2">{filtered.length} clients</div>
            <div className="space-y-2">
              {filtered.map(c => {
                const tag = serviceTag(c.primary_service);
                return (
                  <div key={c.id} onClick={() => openDetail(c)}
                    className="flex items-center gap-3 bg-white border border-[#E6E7E2] rounded-2xl p-3.5 cursor-pointer active:scale-[.98] active:bg-[#F2F5F1] transition">
                    <div className="w-11 h-11 rounded-full bg-[#E7F2EC] text-[#0C5C40] flex items-center justify-center serif font-semibold flex-shrink-0">
                      {initials(c.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-[#15191E] truncate">{c.name}</div>
                      <div className="text-xs text-slate-500 truncate">{c.mobile}{c.assigned_to ? ` · ${c.assigned_to}` : ""}</div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${tag.cls}`}>{tag.label}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* FAB */}
      <button onClick={openAdd}
        className="fixed bottom-24 right-5 md:bottom-8 md:right-8 w-14 h-14 rounded-full bg-green-700 text-white flex items-center justify-center shadow-lg shadow-green-900/30 active:scale-95 transition z-20">
        <Plus className="w-6 h-6" />
      </button>

      {/* Overlay + sheets */}
      {sheet !== "closed" && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-end sm:items-center justify-center" onClick={closeSheet}>
          {(sheet === "add" || sheet === "edit") && (
            <div onClick={e => e.stopPropagation()}
              className="bg-[#FBFBF9] w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 pb-8 sm:pb-6 max-h-[90%] overflow-y-auto">
              <div className="w-9 h-1 bg-slate-300 rounded-full mx-auto mb-4 sm:hidden" />
              <h3 className="serif text-xl font-semibold mb-1">{sheet === "edit" ? "Client Edit Karo" : "Naya Client"}</h3>
              <p className="text-xs text-slate-500 mb-4">Phone pe baat hui? Details yahin daal do.</p>

              {errorMsg && <div className="bg-red-50 text-red-700 text-xs rounded-lg px-3 py-2 mb-3">{errorMsg}</div>}

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Naam *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Ramesh Kumar" className="w-full border border-[#E6E7E2] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-600" />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Mobile *</label>
                    <input value={form.mobile} maxLength={10} onChange={e => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "") })}
                      placeholder="9876543210" className="w-full border border-[#E6E7E2] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-600" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Business</label>
                    <input value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })}
                      placeholder="Ramesh Traders" className="w-full border border-[#E6E7E2] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-600" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Service</label>
                    <select value={form.primary_service} onChange={e => setForm({ ...form, primary_service: e.target.value })}
                      className="w-full border border-[#E6E7E2] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-600 bg-white">
                      <option value="">Select karo</option>
                      {services.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Kisko diya</label>
                    <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}
                      className="w-full border border-[#E6E7E2] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-600 bg-white">
                      <option value="">Select karo</option>
                      {staff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button onClick={closeSheet} className="flex-1 py-3 rounded-xl bg-[#F2F5F1] border border-[#E6E7E2] font-semibold text-sm">Cancel</button>
                <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl bg-green-700 text-white font-semibold text-sm disabled:opacity-60">
                  {saving ? "Save ho raha..." : "Save Karo"}
                </button>
              </div>
            </div>
          )}

          {sheet === "detail" && selected && (
            <div onClick={e => e.stopPropagation()}
              className="bg-[#FBFBF9] w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 pb-8 sm:pb-6 max-h-[90%] overflow-y-auto">
              <div className="w-9 h-1 bg-slate-300 rounded-full mx-auto mb-4 sm:hidden" />
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-[#E7F2EC] text-[#0C5C40] flex items-center justify-center serif font-semibold text-lg">
                    {initials(selected.name)}
                  </div>
                  <div>
                    <div className="font-bold text-base">{selected.name}</div>
                    <div className="text-sm text-slate-500 flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{selected.business_name || "—"}</div>
                  </div>
                </div>
                <button onClick={closeSheet}><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <div className="flex gap-3 my-5">
                <a href={`tel:${selected.mobile}`} className="flex-1 flex flex-col items-center gap-1.5 bg-white border border-[#E6E7E2] rounded-xl py-3 text-xs font-semibold text-[#15191E]">
                  <Phone className="w-4 h-4 text-green-700" />Call
                </a>
                <a href={`https://wa.me/91${selected.mobile}`} target="_blank" rel="noreferrer" className="flex-1 flex flex-col items-center gap-1.5 bg-white border border-[#E6E7E2] rounded-xl py-3 text-xs font-semibold text-[#15191E]">
                  <MessageCircle className="w-4 h-4 text-green-700" />Chat
                </a>
                <button onClick={() => openEdit(selected)} className="flex-1 flex flex-col items-center gap-1.5 bg-white border border-[#E6E7E2] rounded-xl py-3 text-xs font-semibold text-[#15191E]">
                  <Pencil className="w-4 h-4 text-green-700" />Edit
                </button>
              </div>

              <div className="bg-white border border-[#E6E7E2] rounded-2xl divide-y divide-[#E6E7E2] mb-4">
                <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-slate-500">Mobile</span><span className="font-semibold">{selected.mobile}</span></div>
                <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-slate-500">Service</span><span className="font-semibold">{selected.primary_service || "—"}</span></div>
                <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-slate-500">Assigned</span><span className="font-semibold">{selected.assigned_to || "—"}</span></div>
                <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-slate-500">Source</span><span className="font-semibold capitalize">{selected.source || "—"}</span></div>
              </div>

              <div className="flex gap-3">
                <button onClick={remove} className="flex-1 py-3 rounded-xl bg-red-50 text-red-600 font-semibold text-sm">Delete Karo</button>
                <button onClick={closeSheet} className="flex-1 py-3 rounded-xl bg-[#F2F5F1] border border-[#E6E7E2] font-semibold text-sm">Band Karo</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed left-4 right-4 bottom-24 md:left-auto md:right-8 md:w-80 bg-[#1D2420] text-white rounded-xl px-4 py-3 flex items-center justify-between gap-3 shadow-xl z-50">
          <span className="text-sm">{toast.msg}</span>
          {toast.undoId && <button onClick={() => undo(toast.undoId!)} className="text-green-400 font-bold text-sm flex-shrink-0">UNDO</button>}
        </div>
      )}
    </div>
  );
}
