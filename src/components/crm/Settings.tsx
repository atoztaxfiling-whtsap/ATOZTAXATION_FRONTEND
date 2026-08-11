/* Staff + Services — dono ek hi screen pe, tabs me */
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useCrm } from "../../services/crmStore";
import {
  createStaff, updateStaff, deleteStaff, restoreStaff,
  createService, updateService, deleteService, restoreService,
} from "../../services/crmApi";
import { money, type Staff, type Service } from "../../services/crmLogic";
import { Avatar, Panel, PageHead, Btn, Modal, Field, Row2, TextInput, SelectInput } from "./ui";

export default function Settings() {
  const [tab, setTab] = useState<"staff" | "services">("staff");
  return (
    <div className="h-full overflow-y-auto bg-[#F6F5F1] p-5 md:p-7">
      <PageHead title="Setup" sub="Team aur services — yahan se badlo, deploy ki zaroorat nahi" />
      <div className="flex gap-1.5 mb-4">
        {(["staff", "services"] as const).map(k => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-medium border capitalize ${tab === k ? "bg-[#1C1E1B] text-white border-[#1C1E1B]" : "bg-white text-[#6B6F68] border-[#E6E4DD]"}`}>{k}</button>
        ))}
      </div>
      {tab === "staff" ? <StaffList /> : <ServiceList />}
      <div className="h-8" />
    </div>
  );
}

function StaffList() {
  const { staff, reload, toast } = useCrm();
  const [edit, setEdit] = useState<Staff | null>(null);
  const [adding, setAdding] = useState(false);

  async function remove(s: Staff) {
    if (!confirm(`${s.name} ko hatana hai?`)) return;
    await deleteStaff(s.id); toast("Staff hataya gaya", async () => { await restoreStaff(s.id); }); await reload();
  }

  return (
    <>
      <div className="flex justify-end mb-3"><Btn variant="primary" onClick={() => setAdding(true)}><Plus className="w-3.5 h-3.5" />Add staff</Btn></div>
      <Panel>
        {!staff.length && <div className="px-4 py-5 text-[12.5px] text-[#9BA098]">Koi staff nahi.</div>}
        {staff.map(s => (
          <div key={s.id} onClick={() => setEdit(s)} className="flex items-center gap-3 px-4 py-3 border-b border-[#E6E4DD] last:border-0 cursor-pointer hover:bg-[#FBFAF7]">
            <Avatar name={s.name} size={36} />
            <div className="flex-1 min-w-0"><div className="font-medium text-[13.5px]">{s.name}</div>
              <div className="text-[11.5px] text-[#6B6F68] capitalize">{s.role}{s.phone ? ` · ${s.phone}` : ""}{s.email ? ` · ${s.email}` : ""}</div></div>
            <button onClick={e => { e.stopPropagation(); remove(s); }} className="text-[#9BA098] hover:text-[#A32D2D]"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </Panel>
      {(adding || edit) && <StaffModal item={edit} onClose={() => { setAdding(false); setEdit(null); }} />}
    </>
  );
}

function StaffModal({ item, onClose }: { item: Staff | null; onClose: () => void }) {
  const { reload, toast } = useCrm();
  const [f, setF] = useState({ name: item?.name || "", phone: item?.phone || "", email: item?.email || "", role: item?.role || "staff" });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  async function save() {
    if (!f.name.trim()) return;
    setSaving(true);
    try {
      if (item) await updateStaff(item.id, f as any); else await createStaff(f as any);
      toast(item ? "Staff update ho gaya" : "Staff add ho gaya"); await reload(); onClose();
    } catch (e) { alert((e as Error).message); setSaving(false); }
  }

  return (
    <Modal title={item ? "Edit staff" : "Add staff"} onClose={onClose}>
      <Field label="Naam"><TextInput value={f.name} onChange={e => set("name", e.target.value)} /></Field>
      <Row2>
        <Field label="Phone"><TextInput value={f.phone} onChange={e => set("phone", e.target.value)} /></Field>
        <Field label="Role"><SelectInput value={f.role} onChange={e => set("role", e.target.value)}><option value="staff">staff</option><option value="owner">owner</option></SelectInput></Field>
      </Row2>
      <Field label="Email"><TextInput value={f.email} onChange={e => set("email", e.target.value)} /></Field>
      <div className="flex gap-2 justify-end mt-4">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Btn>
      </div>
    </Modal>
  );
}

function ServiceList() {
  const { services, reload, toast } = useCrm();
  const [edit, setEdit] = useState<Service | null>(null);
  const [adding, setAdding] = useState(false);

  async function remove(s: Service) {
    if (!confirm(`${s.name} hatani hai?`)) return;
    await deleteService(s.id); toast("Service hatai gayi", async () => { await restoreService(s.id); }); await reload();
  }

  return (
    <>
      <div className="flex justify-end mb-3"><Btn variant="primary" onClick={() => setAdding(true)}><Plus className="w-3.5 h-3.5" />Add service</Btn></div>
      <div className="text-[12.5px] text-[#6B6F68] mb-3">Ye list non-GST services ke liye hai. GST filing ka rate har client ke apne 4 rates se aata hai.</div>
      <Panel>
        {!services.length && <div className="px-4 py-5 text-[12.5px] text-[#9BA098]">Koi service nahi.</div>}
        {services.map(s => (
          <div key={s.id} onClick={() => setEdit(s)} className="flex items-center gap-3 px-4 py-3 border-b border-[#E6E4DD] last:border-0 cursor-pointer hover:bg-[#FBFAF7]">
            <div className="flex-1 min-w-0"><div className="font-medium text-[13.5px]">{s.name}</div>
              <div className="text-[11.5px] text-[#6B6F68]">{s.default_fee ? money(Number(s.default_fee)) : "—"}{s.min_fee ? ` (min ${money(Number(s.min_fee))})` : ""}</div></div>
            <button onClick={e => { e.stopPropagation(); remove(s); }} className="text-[#9BA098] hover:text-[#A32D2D]"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </Panel>
      {(adding || edit) && <ServiceModal item={edit} onClose={() => { setAdding(false); setEdit(null); }} />}
    </>
  );
}

function ServiceModal({ item, onClose }: { item: Service | null; onClose: () => void }) {
  const { reload, toast } = useCrm();
  const [f, setF] = useState({
    name: item?.name || "", default_fee: item?.default_fee?.toString() || "",
    min_fee: item?.min_fee?.toString() || "", note: item?.note || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  async function save() {
    if (!f.name.trim()) return;
    setSaving(true);
    const payload = { name: f.name.trim(), default_fee: f.default_fee ? Number(f.default_fee) : undefined, min_fee: f.min_fee ? Number(f.min_fee) : undefined, note: f.note || undefined };
    try {
      if (item) await updateService(item.id, payload as any); else await createService(payload as any);
      toast("Service save ho gayi"); await reload(); onClose();
    } catch (e) { alert((e as Error).message); setSaving(false); }
  }

  return (
    <Modal title={item ? "Edit service" : "Add service"} onClose={onClose}>
      <Field label="Naam"><TextInput value={f.name} onChange={e => set("name", e.target.value)} placeholder="ITR-1" /></Field>
      <Row2>
        <Field label="Default fee (₹)"><TextInput type="number" value={f.default_fee} onChange={e => set("default_fee", e.target.value)} /></Field>
        <Field label="Min fee (₹)"><TextInput type="number" value={f.min_fee} onChange={e => set("min_fee", e.target.value)} /></Field>
      </Row2>
      <Field label="Note"><TextInput value={f.note} onChange={e => set("note", e.target.value)} /></Field>
      <div className="flex gap-2 justify-end mt-4">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Btn>
      </div>
    </Modal>
  );
}
