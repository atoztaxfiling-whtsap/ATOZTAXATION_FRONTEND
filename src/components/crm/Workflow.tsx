/* Workflow — non-GST kaam (income tax, TDS, registrations, misc) */
import { useState } from "react";
import { Plus, Trash2, X, Check, Pencil } from "lucide-react";
import { useCrm } from "../../services/crmStore";
import { createTask, updateTask, deleteTask, restoreTask } from "../../services/crmApi";
import { TASK_CATEGORIES, TASK_STATUSES, money, waLink, type Task } from "../../services/crmLogic";
import DocsBox, { docsFor } from "./DocsBox";
import { Panel, PageHead, Btn, Scroller, Th, Td, EmptyRow, SelectInput, Modal, Field, Row2, TextInput, Pill, inlineSelect, inlineInput } from "./ui";

export default function Workflow() {
  const { tasks, clients, staff, reload, loading, toast, patchLocal, removeLocal } = useCrm();
  const [cat, setCat] = useState("");
  const [st, setSt] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const rows = tasks.filter(t => (!cat || t.category === cat) && (!st || t.status === st));

  async function patchDocs(t: Task, docs_required: string[], docs_received: string[]) {
    patchLocal("tasks", t.id, { docs_required, docs_received });   // turant dikha do
    try { await updateTask(t.id, { docs_required, docs_received } as any); }
    catch (e) { alert((e as Error).message); await reload(); }     // fail ho to wapas
  }

  async function patch(t: Task, field: string, value: any) {
    patchLocal("tasks", t.id, { [field]: value });   // instant — reload ka intezaar nahi
    try { await updateTask(t.id, { [field]: value } as any); }
    catch (e) { alert((e as Error).message); await reload(); }
  }
  async function remove(t: Task) {
    if (!confirm(`"${t.name}" delete karna hai?`)) return;
    removeLocal("tasks", t.id);   // turant list se hata do
    toast("Task hata diya", async () => { await restoreTask(t.id); await reload(); });
    try { await deleteTask(t.id); }
    catch (e) { alert((e as Error).message); await reload(); }
  }

  return (
    <div className="h-full overflow-y-auto bg-[#F6F5F1] p-5 md:p-7">
      <PageHead title="Workflow" sub="Non-GST kaam — income tax, TDS, registration, misc"
        actions={<Btn variant="primary" onClick={() => setAdding(true)}><Plus className="w-3.5 h-3.5" />New task</Btn>} />

      <Panel head={<>
        <h3 className="text-[13.5px] font-semibold">Tasks <span className="text-[#9BA098] font-normal">({rows.length})</span></h3>
        <div className="flex gap-2 flex-wrap">
          <SelectInput value={cat} onChange={e => setCat(e.target.value)} className="!w-auto !text-[12.5px] !py-1.5">
            <option value="">All categories</option>{TASK_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </SelectInput>
          <SelectInput value={st} onChange={e => setSt(e.target.value)} className="!w-auto !text-[12.5px] !py-1.5">
            <option value="">All statuses</option>{TASK_STATUSES.map(s => <option key={s}>{s}</option>)}
          </SelectInput>
        </div>
      </>}>
        <div className="hidden md:block">
          <Scroller>
            <thead><tr><Th>Received</Th><Th>Name</Th><Th>Number</Th><Th>Linked client</Th><Th>Category</Th><Th>Documents</Th><Th>Status</Th><Th>Agreed</Th><Th>Paid</Th><Th>Assigned</Th><Th>Comments</Th><Th /></tr></thead>
            <tbody>
              {loading && <EmptyRow colSpan={12}>Load ho raha hai...</EmptyRow>}
              {!loading && !rows.length && <EmptyRow colSpan={12}>Koi task nahi mila.</EmptyRow>}
              {rows.map(t => {
                const linked = t.client_id ? clients.find(c => c.id === t.client_id) : null;
                return (
                  <tr key={t.id} className="hover:bg-[#FBFAF7]">
                    <Td className="font-mono text-[11.5px] text-[#9BA098] whitespace-nowrap">{t.received_date || "—"}</Td>
                    <Td className="font-medium whitespace-nowrap">{t.name}</Td>
                    <Td className="font-mono text-[11.5px] whitespace-nowrap">{t.mobile ? <a href={waLink(t.mobile, "")} target="_blank" rel="noreferrer" className="text-[#0F6E56] hover:underline">{t.mobile}</a> : "—"}</Td>
                    <Td className="text-[12.5px] text-[#9BA098] whitespace-nowrap">{linked ? linked.name : "—"}</Td>
                    <Td><Pill status="">{t.category || "Other"}</Pill></Td>
                    <Td><DocsCell t={t} onSave={(req, rec) => patchDocs(t, req, rec)} /></Td>
                    <Td>
                      <select className={inlineSelect} value={t.status} onChange={e => patch(t, "status", e.target.value)}>
                        {TASK_STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </Td>
                    <Td><input className={inlineInput} style={{ width: 70, minWidth: 70 }} type="number" defaultValue={t.fee_agreed || 0}
                      onBlur={e => { if (Number(e.target.value) !== Number(t.fee_agreed)) patch(t, "fee_agreed", Number(e.target.value) || 0); }} /></Td>
                    <Td><input className={inlineInput} style={{ width: 70, minWidth: 70 }} type="number" defaultValue={t.amount_paid || 0}
                      onBlur={e => { if (Number(e.target.value) !== Number(t.amount_paid)) patch(t, "amount_paid", Number(e.target.value) || 0); }} /></Td>
                    <Td>
                      <select className={inlineSelect} value={t.assigned_to || ""} onChange={e => patch(t, "assigned_to", e.target.value)}>
                        <option value="">—</option>{staff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    </Td>
                    <Td><input className={inlineInput} defaultValue={t.comment || ""} placeholder="Note"
                      onBlur={e => { if (e.target.value !== (t.comment || "")) patch(t, "comment", e.target.value); }} /></Td>
                    <Td><div className="flex items-center gap-2.5">
                      <button onClick={() => setEditing(t)} title="Edit details" className="text-[#9BA098] hover:text-[#1D2420]"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => remove(t)} title="Delete" className="text-[#9BA098] hover:text-[#A32D2D]"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div></Td>
                  </tr>
                );
              })}
            </tbody>
          </Scroller>
        </div>

        <div className="md:hidden">
          {!rows.length && <div className="px-4 py-5 text-[12.5px] text-[#9BA098]">Koi task nahi mila.</div>}
          {rows.map(t => {
            const bal = (Number(t.fee_agreed) || 0) - (Number(t.amount_paid) || 0);
            return (
              <div key={t.id} className="px-4 py-3 border-b border-[#E6E4DD] last:border-0">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0"><div className="font-medium text-[13.5px] truncate">{t.name}</div>
                    {t.mobile && <div className="text-[11.5px] text-[#6B6F68] font-mono">{t.mobile}</div>}
                    <div className="text-[11.5px] text-[#6B6F68]">{t.category} · {t.assigned_to || "—"} · {t.received_date}</div></div>
                  <span className={`font-mono text-[12px] font-semibold ${bal > 0 ? "text-[#A32D2D]" : "text-[#0F6E56]"}`}>{bal > 0 ? money(bal) : "Clear"}</span>
                </div>
                <div className="flex gap-1.5 items-center">
                  <select className={inlineSelect} value={t.status} onChange={e => patch(t, "status", e.target.value)}>
                    {TASK_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <button onClick={() => setEditing(t)} className="text-[#9BA098] ml-auto"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(t)} className="text-[#9BA098]"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="mt-1.5"><DocsCell t={t} onSave={(req, rec) => patchDocs(t, req, rec)} /></div>
              </div>
            );
          })}
        </div>
      </Panel>

      {adding && <TaskModal onClose={() => setAdding(false)} />}
      {editing && <EditTaskModal task={editing} onClose={() => setEditing(null)} onDelete={() => { const t = editing; setEditing(null); remove(t); }} />}
      <div className="h-8" />
    </div>
  );
}

function TaskModal({ onClose }: { onClose: () => void }) {
  const { clients, staff, services, reload, toast } = useCrm();
  const [f, setF] = useState({ name: "", mobile: "", category: TASK_CATEGORIES[0], assigned_to: staff[0]?.name || "", client_id: "", fee_agreed: "", amount_paid: "", comment: "" });
  const [docs, setDocs] = useState<string[]>(() => docsFor(TASK_CATEGORIES[0], services));
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
  /* Category badli to documents ki list apne aap badal do — par sirf tab jab
     user ne khud list chhedi na ho. Warna uski likhi hui list mit jayegi. */
  const [touched, setTouched] = useState(false);
  function pickCategory(v: string) {
    set("category", v);
    if (!touched) setDocs(docsFor(v, services));
  }

  async function save() {
    if (!f.name.trim()) return;
    setSaving(true);
    try {
      await createTask({
        name: f.name.trim(), mobile: f.mobile.trim() || null, category: f.category, assigned_to: f.assigned_to || null,
        client_id: f.client_id || null, fee_agreed: Number(f.fee_agreed) || 0,
        amount_paid: Number(f.amount_paid) || 0, comment: f.comment || null, status: "Yet to Pick",
        docs_required: docs, docs_received: [],
      } as any);
      toast("Task add ho gaya"); await reload(); onClose();
    } catch (e) { alert((e as Error).message); setSaving(false); }
  }

  return (
    <Modal title="New task" sub="Non-GST kaam add karo" onClose={onClose}>
      <Row2>
        <Field label="Name"><TextInput value={f.name} onChange={e => set("name", e.target.value)} placeholder="Client ya task ka naam" /></Field>
        <Field label="Phone (WhatsApp)"><TextInput value={f.mobile} maxLength={10} onChange={e => set("mobile", e.target.value.replace(/\D/g, ""))} placeholder="10-digit" /></Field>
      </Row2>
      <Row2>
        <Field label="Category"><SelectInput value={f.category} onChange={e => pickCategory(e.target.value)}>
          {TASK_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          {services.filter(sv => !TASK_CATEGORIES.includes(sv.name)).map(sv => <option key={sv.id}>{sv.name}</option>)}
        </SelectInput></Field>
        <Field label="Assigned to"><SelectInput value={f.assigned_to} onChange={e => set("assigned_to", e.target.value)}>
          <option value="">—</option>{staff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
        </SelectInput></Field>
      </Row2>
      <Field label="Kisi client se jodo (optional)">
        <SelectInput value={f.client_id} onChange={e => set("client_id", e.target.value)}>
          <option value="">— koi nahi / walk-in —</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </SelectInput>
      </Field>
      <Row2>
        <Field label="Amount agreed (₹)"><TextInput type="number" value={f.fee_agreed} onChange={e => set("fee_agreed", e.target.value)} placeholder="0" /></Field>
        <Field label="Amount paid (₹)"><TextInput type="number" value={f.amount_paid} onChange={e => set("amount_paid", e.target.value)} placeholder="0" /></Field>
      </Row2>
      <Field label="Kaunse documents chahiye" hint="Service chunne pe list apne aap aati hai — badal sakte ho, apna bhi likh sakte ho">
        <DocsEditor list={docs} onChange={l => { setTouched(true); setDocs(l); }} />
      </Field>
      <Field label="Comment"><TextInput value={f.comment} onChange={e => set("comment", e.target.value)} placeholder="Optional note" /></Field>
      <div className="flex gap-2 justify-end mt-4">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Saving..." : "Add task"}</Btn>
      </div>
    </Modal>
  );
}

function EditTaskModal({ task, onClose, onDelete }: { task: Task; onClose: () => void; onDelete: () => void }) {
  const { clients, staff, reload, patchLocal, toast } = useCrm();
  const [f, setF] = useState({
    name: task.name || "", mobile: task.mobile || "", category: task.category || TASK_CATEGORIES[0],
    client_id: task.client_id || "", assigned_to: task.assigned_to || "",
    status: task.status || TASK_STATUSES[0],
    fee_agreed: String(task.fee_agreed ?? ""), amount_paid: String(task.amount_paid ?? ""),
    comment: task.comment || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  async function save() {
    if (!f.name.trim()) return;
    setSaving(true);
    const patch = {
      name: f.name.trim(), mobile: f.mobile.trim() || null, category: f.category,
      client_id: f.client_id || null, assigned_to: f.assigned_to || null, status: f.status,
      fee_agreed: Number(f.fee_agreed) || 0, amount_paid: Number(f.amount_paid) || 0,
      comment: f.comment || null,
    };
    patchLocal("tasks", task.id, patch);   // turant dikha do
    try { await updateTask(task.id, patch as any); toast("Task update ho gaya"); onClose(); }
    catch (e) { alert((e as Error).message); setSaving(false); await reload(); }
  }

  return (
    <Modal title="Edit task" sub={task.name} onClose={onClose}>
      <Row2>
        <Field label="Name"><TextInput value={f.name} onChange={e => set("name", e.target.value)} /></Field>
        <Field label="Phone (WhatsApp)"><TextInput value={f.mobile} maxLength={10} onChange={e => set("mobile", e.target.value.replace(/\D/g, ""))} placeholder="10-digit" /></Field>
      </Row2>
      <Row2>
        <Field label="Category"><SelectInput value={f.category} onChange={e => set("category", e.target.value)}>
          {TASK_CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </SelectInput></Field>
        <Field label="Status"><SelectInput value={f.status} onChange={e => set("status", e.target.value)}>
          {TASK_STATUSES.map(sx => <option key={sx}>{sx}</option>)}
        </SelectInput></Field>
      </Row2>
      <Field label="Kisi client se jodo (optional)">
        <SelectInput value={f.client_id} onChange={e => set("client_id", e.target.value)}>
          <option value="">— koi nahi / walk-in —</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </SelectInput>
      </Field>
      <Row2>
        <Field label="Assigned to"><SelectInput value={f.assigned_to} onChange={e => set("assigned_to", e.target.value)}>
          <option value="">—</option>{staff.map(sx => <option key={sx.id} value={sx.name}>{sx.name}</option>)}
        </SelectInput></Field>
        <Field label="Comment"><TextInput value={f.comment} onChange={e => set("comment", e.target.value)} placeholder="Optional note" /></Field>
      </Row2>
      <Row2>
        <Field label="Amount agreed (₹)"><TextInput type="number" value={f.fee_agreed} onChange={e => set("fee_agreed", e.target.value)} placeholder="0" /></Field>
        <Field label="Amount paid (₹)"><TextInput type="number" value={f.amount_paid} onChange={e => set("amount_paid", e.target.value)} placeholder="0" /></Field>
      </Row2>
      <div className="flex gap-2 justify-between items-center mt-4">
        <Btn onClick={onDelete} className="!text-[#A32D2D]"><Trash2 className="w-3.5 h-3.5" />Delete</Btn>
        <div className="flex gap-2">
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Btn>
        </div>
      </div>
    </Modal>
  );
}

/* Table ke andar chhota summary — dabao to poora box khulta hai */
function DocsCell({ t, onSave }: { t: Task; onSave: (req: string[], rec: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const req = t.docs_required || [];
  const rec = t.docs_received || [];
  const done = req.filter(d => rec.some(r => r.toLowerCase() === d.toLowerCase())).length;
  const tone = !req.length ? "text-[#9BA098]" : done === req.length ? "text-[#0F6E56]" : "text-[#A35A17]";
  return (
    <>
      <button onClick={() => setOpen(true)}
        className={`text-[11.5px] font-medium ${tone} hover:underline whitespace-nowrap`}>
        {req.length ? `${done}/${req.length} mile` : "+ list banao"}
      </button>
      {open && <DocsBox task={t} onClose={() => setOpen(false)} onSave={onSave} />}
    </>
  );
}

/* Naya task banate waqt list edit karne ke liye */
export function DocsEditor({ list, onChange }: { list: string[]; onChange: (l: string[]) => void }) {
  const [add, setAdd] = useState("");
  function push() {
    const v = add.trim();
    if (!v || list.some(x => x.toLowerCase() === v.toLowerCase())) { setAdd(""); return; }
    onChange([...list, v]); setAdd("");
  }
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {list.map(d => (
          <span key={d} className="inline-flex items-center gap-1 text-[11.5px] bg-[#F2F1EC] border border-[#E6E4DD] rounded-full pl-2.5 pr-1 py-1">
            {d}
            <button onClick={() => onChange(list.filter(x => x !== d))}
              className="text-[#9BA098] hover:text-[#A32D2D] p-0.5"><X className="w-3 h-3" /></button>
          </span>
        ))}
        {!list.length && <span className="text-[11.5px] text-[#9BA098]">Koi document nahi — neeche likh ke add karo</span>}
      </div>
      <div className="flex gap-1.5">
        <TextInput value={add} onChange={e => setAdd(e.target.value)} placeholder="Document ka naam"
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); push(); } }} />
        <Btn size="sm" onClick={push}><Check className="w-3.5 h-3.5" /></Btn>
      </div>
    </div>
  );
}
