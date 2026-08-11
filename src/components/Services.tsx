import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { fetchCrmServices, createCrmService, updateCrmService, deleteCrmService, restoreCrmService, type CrmService } from "../services/api";

export default function Services({ onBack }: { onBack?: () => void }) {
  const [rows, setRows] = useState<CrmService[]>([]);
  const [loading, setLoading] = useState(false);
  const [sheet, setSheet] = useState<"closed" | "form">("closed");
  const [editing, setEditing] = useState<CrmService | null>(null);
  const [form, setForm] = useState({ name: "", default_fee: "", min_fee: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; undoId?: string } | null>(null);

  const load = useCallback(async () => { setLoading(true); try { setRows(await fetchCrmServices()); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); }, [toast]);

  function openAdd() { setEditing(null); setForm({ name: "", default_fee: "", min_fee: "", note: "" }); setSheet("form"); }
  function openEdit(s: CrmService & { note?: string }) { setEditing(s); setForm({ name: s.name, default_fee: s.default_fee?.toString() || "", min_fee: s.min_fee?.toString() || "", note: (s as any).note || "" }); setSheet("form"); }
  function close() { setSheet("closed"); }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { name: form.name.trim(), default_fee: form.default_fee ? Number(form.default_fee) : undefined, min_fee: form.min_fee ? Number(form.min_fee) : undefined, note: form.note || undefined };
    try {
      if (editing) { await updateCrmService(editing.id, payload); setToast({ msg: "Service update ho gayi" }); }
      else { await createCrmService(payload as any); setToast({ msg: "Service add ho gayi" }); }
      close(); await load();
    } catch (e) { alert("Save nahi hua: " + (e as Error).message); }
    finally { setSaving(false); }
  }

  async function remove(s: CrmService) {
    if (!confirm(`${s.name} hatani hai?`)) return;
    try { await deleteCrmService(s.id); setRows(prev => prev.filter(r => r.id !== s.id)); setToast({ msg: "Service hatai gayi", undoId: s.id }); }
    catch (e) { alert("Delete nahi hua: " + (e as Error).message); }
  }
  async function undo(id: string) { try { await restoreCrmService(id); setToast(null); await load(); } catch (e) { alert("Undo nahi hua: " + (e as Error).message); } }

  return (
    <div className="h-full overflow-y-auto bg-[#F2F5F1] relative pb-24">
      <div className="bg-[#FBFBF9] px-5 pt-5 pb-3 sticky top-0 z-10 border-b border-[#E6E7E2] flex items-center gap-2">
        {onBack && <button onClick={onBack} className="text-green-700 font-semibold text-sm mr-1">‹ More</button>}
        <div><h2 className="serif text-xl font-semibold text-[#15191E]">Services</h2><p className="text-xs text-slate-500">Fees yahin se badlengi, deploy nahi chahiye</p></div>
      </div>
      <div className="px-4 pt-3">
        {loading ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-9 w-9 border-b-2 border-green-600" /></div> :
          rows.length === 0 ? <div className="text-center py-16 text-slate-500">Koi service nahi hai</div> :
          <div className="space-y-2">
            {rows.map(s => (
              <div key={s.id} onClick={() => openEdit(s)} className="flex items-center gap-3 bg-white border border-[#E6E7E2] rounded-2xl p-3.5 cursor-pointer active:bg-[#F2F5F1]">
                <div className="flex-1 min-w-0"><div className="font-semibold text-sm">{s.name}</div>
                  <div className="text-xs text-slate-500">₹{s.default_fee ?? "—"}{s.min_fee ? ` (min ₹${s.min_fee})` : ""}</div></div>
                <button onClick={e => { e.stopPropagation(); remove(s); }} className="text-red-400 p-1.5"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>}
      </div>
      <button onClick={openAdd} className="fixed bottom-24 right-5 md:bottom-8 md:right-8 w-14 h-14 rounded-full bg-green-700 text-white flex items-center justify-center shadow-lg shadow-green-900/30 active:scale-95 z-20"><Plus className="w-6 h-6" /></button>

      {sheet === "form" && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-end sm:items-center justify-center" onClick={close}>
          <div onClick={e => e.stopPropagation()} className="bg-[#FBFBF9] w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 pb-8 sm:pb-6 max-h-[85%] overflow-y-auto">
            <div className="w-9 h-1 bg-slate-300 rounded-full mx-auto mb-4 sm:hidden" />
            <h3 className="serif text-xl font-semibold mb-4">{editing ? "Service Edit Karo" : "Nayi Service"}</h3>
            <div className="space-y-3">
              <div><label className="text-xs font-semibold text-slate-500 block mb-1">Naam *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="GST Registration" className="w-full border border-[#E6E7E2] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-600" /></div>
              <div className="flex gap-3">
                <div className="flex-1"><label className="text-xs font-semibold text-slate-500 block mb-1">Default Fee (₹)</label><input value={form.default_fee} onChange={e => setForm({ ...form, default_fee: e.target.value.replace(/\D/g, "") })} className="w-full border border-[#E6E7E2] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-600" /></div>
                <div className="flex-1"><label className="text-xs font-semibold text-slate-500 block mb-1">Min Fee (₹)</label><input value={form.min_fee} onChange={e => setForm({ ...form, min_fee: e.target.value.replace(/\D/g, "") })} className="w-full border border-[#E6E7E2] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-600" /></div>
              </div>
              <div><label className="text-xs font-semibold text-slate-500 block mb-1">Note</label><input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} className="w-full border border-[#E6E7E2] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-600" /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={close} className="flex-1 py-3 rounded-xl bg-[#F2F5F1] border border-[#E6E7E2] font-semibold text-sm">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl bg-green-700 text-white font-semibold text-sm disabled:opacity-60">{saving ? "Save ho raha..." : "Save Karo"}</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed left-4 right-4 bottom-24 md:left-auto md:right-8 md:w-80 bg-[#1D2420] text-white rounded-xl px-4 py-3 flex items-center justify-between gap-3 shadow-xl z-50">
          <span className="text-sm">{toast.msg}</span>
          {toast.undoId && <button onClick={() => undo(toast.undoId!)} className="text-green-400 font-bold text-sm flex-shrink-0">UNDO</button>}
        </div>
      )}
    </div>
  );
}
