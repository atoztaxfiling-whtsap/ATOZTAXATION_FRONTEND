/* Registrations — naye GST cases, complete hote hi client bana do */
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useCrm } from "../../services/crmStore";
import { createRegistration, updateRegistration, deleteRegistration, convertRegistration } from "../../services/crmApi";
import { REG_STATUSES, FILING_MODES, type Registration, type Client } from "../../services/crmLogic";
import { Avatar, Pill, Panel, PageHead, Btn, Scroller, Th, Td, EmptyRow, Modal, Field, Row2, TextInput, SelectInput, FieldsetLabel, inlineSelect } from "./ui";

export default function Registrations() {
  const { registrations, staff, reload, loading, toast } = useCrm();
  const [adding, setAdding] = useState(false);
  const [converting, setConverting] = useState<Registration | null>(null);

  async function setStatus(r: Registration, status: string) {
    try { await updateRegistration(r.id, { status }); await reload(); }
    catch (e) { alert((e as Error).message); }
  }
  async function remove(r: Registration) {
    if (!confirm(`${r.name} ki registration delete karni hai?`)) return;
    await deleteRegistration(r.id); toast("Registration hata di"); await reload();
  }

  return (
    <div className="h-full overflow-y-auto bg-[#F6F5F1] p-5 md:p-7">
      <PageHead title="Registrations" sub="Naye GST registration cases — complete hote hi client bana lo"
        actions={<Btn variant="primary" onClick={() => setAdding(true)}><Plus className="w-3.5 h-3.5" />Add registration</Btn>} />

      <Panel>
        <div className="hidden md:block">
          <Scroller>
            <thead><tr><Th>Applicant</Th><Th>TRN</Th><Th>Assigned</Th><Th>Status</Th><Th /><Th /></tr></thead>
            <tbody>
              {loading && <EmptyRow colSpan={6}>Load ho raha hai...</EmptyRow>}
              {!loading && !registrations.length && <EmptyRow colSpan={6}>Abhi koi registration nahi.</EmptyRow>}
              {registrations.map(r => (
                <tr key={r.id} className="hover:bg-[#FBFAF7]">
                  <Td><div className="flex items-center gap-2.5"><Avatar name={r.name} /><div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-[11.5px] text-[#9BA098]">{r.business_name || r.mobile || "—"}</div></div></div></Td>
                  <Td className="font-mono text-[11.5px] text-[#9BA098]">{r.trn || "—"}</Td>
                  <Td><span className="text-[12.5px] text-[#6B6F68]">{r.assigned_to || "—"}</span></Td>
                  <Td>
                    {r.converted_client_id ? <Pill status={r.status} />
                      : <select className={inlineSelect} value={r.status} onChange={e => setStatus(r, e.target.value)}>
                        {REG_STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>}
                  </Td>
                  <Td>{r.converted_client_id ? <Pill status="Completed">Client created</Pill>
                    : <Btn size="sm" variant="primary" onClick={() => setConverting(r)}>Convert to client</Btn>}</Td>
                  <Td><button onClick={() => remove(r)} className="text-[#9BA098] hover:text-[#A32D2D]"><Trash2 className="w-3.5 h-3.5" /></button></Td>
                </tr>
              ))}
            </tbody>
          </Scroller>
        </div>

        <div className="md:hidden">
          {!registrations.length && <div className="px-4 py-5 text-[12.5px] text-[#9BA098]">Abhi koi registration nahi.</div>}
          {registrations.map(r => (
            <div key={r.id} className="px-4 py-3 border-b border-[#E6E4DD] last:border-0">
              <div className="flex items-center gap-3 mb-2">
                <Avatar name={r.name} size={36} />
                <div className="flex-1 min-w-0"><div className="font-medium text-[13.5px] truncate">{r.name}</div>
                  <div className="text-[11.5px] text-[#6B6F68] truncate">{r.trn || r.mobile || "—"} · {r.assigned_to || "—"}</div></div>
                <button onClick={() => remove(r)} className="text-[#9BA098]"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="flex gap-2 items-center">
                {r.converted_client_id ? <Pill status="Completed">Client bana</Pill> : <>
                  <select className={inlineSelect} value={r.status} onChange={e => setStatus(r, e.target.value)}>
                    {REG_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <Btn size="sm" variant="primary" onClick={() => setConverting(r)}>Client banao</Btn>
                </>}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {adding && <AddRegModal onClose={() => setAdding(false)} />}
      {converting && <ConvertModal reg={converting} onClose={() => setConverting(null)} />}
      <div className="h-8" />
    </div>
  );
}

function AddRegModal({ onClose }: { onClose: () => void }) {
  const { staff, reload, toast } = useCrm();
  const [f, setF] = useState({ name: "", business_name: "", mobile: "", trn: "", assigned_to: staff[0]?.name || "", status: REG_STATUSES[0] });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  async function save() {
    if (!f.name.trim()) return;
    setSaving(true);
    try { await createRegistration(f as any); toast("Registration add ho gayi"); await reload(); onClose(); }
    catch (e) { alert((e as Error).message); setSaving(false); }
  }

  return (
    <Modal title="Add registration" sub="Naya GST registration lead" onClose={onClose}>
      <Field label="Applicant name"><TextInput value={f.name} onChange={e => set("name", e.target.value)} placeholder="Full name" /></Field>
      <Row2>
        <Field label="Business name"><TextInput value={f.business_name} onChange={e => set("business_name", e.target.value)} /></Field>
        <Field label="Phone"><TextInput value={f.mobile} maxLength={10} onChange={e => set("mobile", e.target.value.replace(/\D/g, ""))} /></Field>
      </Row2>
      <Row2>
        <Field label="TRN"><TextInput value={f.trn} onChange={e => set("trn", e.target.value)} placeholder="TRN number" /></Field>
        <Field label="Assigned to"><SelectInput value={f.assigned_to} onChange={e => set("assigned_to", e.target.value)}>
          <option value="">—</option>{staff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
        </SelectInput></Field>
      </Row2>
      <Field label="Status"><SelectInput value={f.status} onChange={e => set("status", e.target.value)}>{REG_STATUSES.map(s => <option key={s}>{s}</option>)}</SelectInput></Field>
      <div className="flex gap-2 justify-end mt-4">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Saving..." : "Add registration"}</Btn>
      </div>
    </Modal>
  );
}

function ConvertModal({ reg, onClose }: { reg: Registration; onClose: () => void }) {
  const { staff, reload, toast } = useCrm();
  const [f, setF] = useState({
    business_name: reg.business_name || reg.name, mobile: reg.mobile || "",
    portal_username: "", portal_password: "",
    regdate: new Date().toISOString().slice(0, 10), filing_mode: "auto",
    fee_monthly_nil: "", fee_monthly_sales: "", fee_quarterly_nil: "", fee_quarterly_sales: "",
    assigned_to: reg.assigned_to || staff[0]?.name || "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  async function save() {
    if (!/^[6-9]\d{9}$/.test(f.mobile)) { setErr("Sahi 10-digit mobile number chahiye"); return; }
    const [y, m] = f.regdate.split("-").map(Number);
    setSaving(true); setErr("");
    const payload: Partial<Client> = {
      mobile: f.mobile, business_name: f.business_name || null,
      portal_username: f.portal_username || null, portal_password: f.portal_password || null,
      reg_year: y, reg_month: m, filing_mode: f.filing_mode, assigned_to: f.assigned_to || null,
      fee_monthly_nil: Number(f.fee_monthly_nil) || 500,
      fee_monthly_sales: Number(f.fee_monthly_sales) || 1000,
      fee_quarterly_nil: Number(f.fee_quarterly_nil) || 800,
      fee_quarterly_sales: Number(f.fee_quarterly_sales) || 2000,
    };
    try { await convertRegistration(reg.id, payload); toast(`${reg.name} ab client hai`); await reload(); onClose(); }
    catch (e) { setErr((e as Error).message); setSaving(false); }
  }

  return (
    <Modal title="Convert to client" sub={`${reg.name} — filing aur fees set karo`} onClose={onClose}>
      {err && <div className="bg-[#FCEBEB] text-[#501313] text-[12.5px] rounded-lg px-3 py-2 mb-3">{err}</div>}
      <Row2>
        <Field label="Business name"><TextInput value={f.business_name} onChange={e => set("business_name", e.target.value)} /></Field>
        <Field label="Phone (WhatsApp)"><TextInput value={f.mobile} maxLength={10} onChange={e => set("mobile", e.target.value.replace(/\D/g, ""))} /></Field>
      </Row2>
      <Row2>
        <Field label="GST username"><TextInput value={f.portal_username} onChange={e => set("portal_username", e.target.value)} /></Field>
        <Field label="Password"><TextInput value={f.portal_password} onChange={e => set("portal_password", e.target.value)} /></Field>
      </Row2>
      <Row2>
        <Field label="Registration date"><TextInput type="date" value={f.regdate} onChange={e => set("regdate", e.target.value)} /></Field>
        <Field label="Filing mode"><SelectInput value={f.filing_mode} onChange={e => set("filing_mode", e.target.value)}>
          {FILING_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </SelectInput></Field>
      </Row2>
      <FieldsetLabel>Monthly rates</FieldsetLabel>
      <Row2>
        <Field label="Nil (₹)"><TextInput type="number" value={f.fee_monthly_nil} onChange={e => set("fee_monthly_nil", e.target.value)} placeholder="500" /></Field>
        <Field label="Sales (₹)"><TextInput type="number" value={f.fee_monthly_sales} onChange={e => set("fee_monthly_sales", e.target.value)} placeholder="1000" /></Field>
      </Row2>
      <FieldsetLabel>Quarterly rates</FieldsetLabel>
      <Row2>
        <Field label="Nil (₹)"><TextInput type="number" value={f.fee_quarterly_nil} onChange={e => set("fee_quarterly_nil", e.target.value)} placeholder="800" /></Field>
        <Field label="Sales (₹)"><TextInput type="number" value={f.fee_quarterly_sales} onChange={e => set("fee_quarterly_sales", e.target.value)} placeholder="2000" /></Field>
      </Row2>
      <Field label="Assigned to"><SelectInput value={f.assigned_to} onChange={e => set("assigned_to", e.target.value)}>
        <option value="">—</option>{staff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
      </SelectInput></Field>
      <div className="flex gap-2 justify-end mt-4">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Bana raha..." : "Create client"}</Btn>
      </div>
    </Modal>
  );
}
