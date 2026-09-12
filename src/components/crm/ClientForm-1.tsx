/* Add / Edit client — demo wale saare fields (4 rates, mode, logins, linked) */
import { useState } from "react";
import { useCrm } from "../../services/crmStore";
import { createClient, updateClient } from "../../services/crmApi";
import { FILING_MODES, BUSINESS_TYPES, checkDuplicateGSTIN, type Client } from "../../services/crmLogic";
import { Modal, Field, Row2, TextInput, SelectInput, FieldsetLabel, Btn } from "./ui";

interface Props { client?: Client | null; onClose: () => void; onSaved?: (c: Client) => void; }

function todayStr() { return new Date().toISOString().slice(0, 10); }
function regDateOf(c?: Client | null) {
  if (c?.reg_year && c?.reg_month) return `${c.reg_year}-${String(c.reg_month).padStart(2, "0")}-01`;
  return todayStr();
}

export default function ClientForm({ client, onClose, onSaved }: Props) {
  const { staff, clients, reload, toast } = useCrm();
  const editing = !!client;
  const [f, setF] = useState({
    name: client?.name || "",
    business_name: client?.business_name || "",
    mobile: client?.mobile || "",
    alt_mobile: client?.alt_mobile || "",
    gstin: client?.gstin || "",
    portal_username: client?.portal_username || "",
    portal_password: client?.portal_password || "",
    regdate: regDateOf(client),
    filing_mode: client?.filing_mode || "auto",
    fee_monthly_nil: client?.fee_monthly_nil ?? "",
    fee_monthly_sales: client?.fee_monthly_sales ?? "",
    fee_quarterly_nil: client?.fee_quarterly_nil ?? "",
    fee_quarterly_sales: client?.fee_quarterly_sales ?? "",
    fee_annual: client?.fee_annual ?? "",
    annual_due_date: client?.annual_due_date || "",
    assigned_to: client?.assigned_to || (staff[0]?.name ?? ""),
    business_type: client?.business_type || "unknown",
  });
  const [linked, setLinked] = useState<string[]>(client?.linked_client_ids || []);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  function sameSet(a: string[], b: string[]) {
    if (a.length !== b.length) return false;
    const sb = new Set(b); return a.every(x => sb.has(x));
  }

  // Kisi ek member se link karne par poore group ko mesh kar deta hai.
  async function meshGroupLinks(focalId: string, selectedIds: string[]) {
    const byId = new Map(clients.map(c => [c.id, c] as const));
    const adj = (id: string) => (byId.get(id)?.linked_client_ids || []).filter(x => x !== focalId);
    const comp = new Set(selectedIds.filter(x => x && x !== focalId));
    const stack = [...comp];
    while (stack.length) {
      const cur = stack.pop() as string;
      for (const nb of adj(cur)) if (nb !== focalId && !comp.has(nb)) { comp.add(nb); stack.push(nb); }
    }
    const group = new Set<string>([focalId, ...comp]);
    const writes: Promise<unknown>[] = [];
    writes.push(updateClient(focalId, { linked_client_ids: [...group].filter(x => x !== focalId) }));
    for (const id of comp) {
      const desired = [...group].filter(x => x !== id);
      const cur = byId.get(id)?.linked_client_ids || [];
      if (!sameSet(cur, desired)) writes.push(updateClient(id, { linked_client_ids: desired }));
    }
    for (const c of clients) {
      if (c.id === focalId || group.has(c.id)) continue;
      const cur = c.linked_client_ids || [];
      if (cur.includes(focalId)) writes.push(updateClient(c.id, { linked_client_ids: cur.filter(x => x !== focalId) }));
    }
    await Promise.all(writes);
  }

  async function save() {
    if (!f.name.trim()) { setErr("Naam zaroori hai"); return; }
    if (!/^[6-9]\d{9}$/.test(f.mobile)) { setErr("Sahi 10-digit mobile number daalo"); return; }
    const dup = checkDuplicateGSTIN(clients, f.gstin.trim(), client?.id);
    if (dup && !confirm(`Ye GSTIN pehle se ${dup.name} ke paas hai. Phir bhi save karein?`)) return;

    const [y, m] = f.regdate.split("-").map(Number);
    const payload: Partial<Client> = {
      name: f.name.trim(), business_name: f.business_name.trim() || null, mobile: f.mobile,
      alt_mobile: f.alt_mobile.trim() || null,
      gstin: f.gstin.trim() || null, portal_username: f.portal_username.trim() || null,
      portal_password: f.portal_password.trim() || null,
      reg_year: y, reg_month: m, filing_mode: f.filing_mode,
      fee_monthly_nil: f.fee_monthly_nil === "" ? 500 : Number(f.fee_monthly_nil),
      fee_monthly_sales: f.fee_monthly_sales === "" ? 1000 : Number(f.fee_monthly_sales),
      fee_quarterly_nil: f.fee_quarterly_nil === "" ? 800 : Number(f.fee_quarterly_nil),
      fee_quarterly_sales: f.fee_quarterly_sales === "" ? 2000 : Number(f.fee_quarterly_sales),
      fee_annual: f.fee_annual === "" ? null : Number(f.fee_annual),
      annual_due_date: f.annual_due_date || null,
      assigned_to: f.assigned_to || null,
      business_type: f.business_type || null,
    };

    setSaving(true); setErr("");
    try {
      const saved = editing ? await updateClient(client!.id, payload) : await createClient(payload);
      // Group-mesh: jis ek se bhi link karo, poore group se link ho (aur sab me naya bhi aa jaye)
      await meshGroupLinks(saved.id, linked);
      toast(editing ? "Client update ho gaya" : "Client add ho gaya");
      await reload();
      onSaved?.(saved);
      onClose();
    } catch (e) { setErr((e as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={editing ? "Edit client" : "Add client"} sub={editing ? client!.name : "Registration ke bina seedha client add karo"} onClose={onClose}>
      {err && <div className="bg-[#FCEBEB] text-[#501313] text-[12.5px] rounded-lg px-3 py-2 mb-3">{err}</div>}

      <Row2>
        <Field label="Client name"><TextInput value={f.name} onChange={e => set("name", e.target.value)} placeholder="Full name" /></Field>
        <Field label="Business name"><TextInput value={f.business_name} onChange={e => set("business_name", e.target.value)} placeholder="Business name" /></Field>
      </Row2>
      <Row2>
        <Field label="Phone (WhatsApp)"><TextInput value={f.mobile} maxLength={10} onChange={e => set("mobile", e.target.value.replace(/\D/g, ""))} placeholder="9876543210" /></Field>
        <Field label="GSTIN"><TextInput value={f.gstin} onChange={e => set("gstin", e.target.value.toUpperCase())} placeholder="GSTIN" /></Field>
      </Row2>
      <Row2>
        <Field label="Alternate number" hint="Sirf record ke liye — is number pe bot koi followup NAHI bhejega">
          <TextInput value={f.alt_mobile} onChange={e => set("alt_mobile", e.target.value)} placeholder="Doosra number (optional)" />
        </Field>
        <div />
      </Row2>
      <Row2>
        <Field label="GST username"><TextInput value={f.portal_username} onChange={e => set("portal_username", e.target.value)} placeholder="portal username" /></Field>
        <Field label="Password"><TextInput value={f.portal_password} onChange={e => set("portal_password", e.target.value)} placeholder="portal password" /></Field>
      </Row2>
      <Row2>
        <Field label="Registration date"><TextInput type="date" value={f.regdate} onChange={e => set("regdate", e.target.value)} /></Field>
        <Field label="Filing mode">
          <SelectInput value={f.filing_mode} onChange={e => set("filing_mode", e.target.value)}>
            {FILING_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </SelectInput>
        </Field>
      </Row2>

      {f.filing_mode === "manual-annual" && (
        <>
          <FieldsetLabel>Annual (monthly/quarterly reminder band)</FieldsetLabel>
          <Row2>
            <Field label="Annual due date" hint="Is date ke aas-paas reminder + agle saal followup">
              <TextInput type="date" value={f.annual_due_date} onChange={e => set("annual_due_date", e.target.value)} />
            </Field>
            <Field label="Annual fee (₹)"><TextInput type="number" value={f.fee_annual} onChange={e => set("fee_annual", e.target.value)} placeholder="0" /></Field>
          </Row2>
          <div className="text-[11.5px] text-[#6B6F68] mb-2">💡 Installment plan (50% ab, 50% baad) client kholke "Installments" me daalo — us date pe payment reminder khud jayega.</div>
        </>
      )}

      <FieldsetLabel>Monthly rates</FieldsetLabel>
      <Row2>
        <Field label="Nil filing (₹)"><TextInput type="number" value={f.fee_monthly_nil} onChange={e => set("fee_monthly_nil", e.target.value)} placeholder="500" /></Field>
        <Field label="Sales filing (₹)"><TextInput type="number" value={f.fee_monthly_sales} onChange={e => set("fee_monthly_sales", e.target.value)} placeholder="1000" /></Field>
      </Row2>

      <FieldsetLabel>Quarterly rates</FieldsetLabel>
      <Row2>
        <Field label="Nil filing (₹)"><TextInput type="number" value={f.fee_quarterly_nil} onChange={e => set("fee_quarterly_nil", e.target.value)} placeholder="800" /></Field>
        <Field label="Sales filing (₹)"><TextInput type="number" value={f.fee_quarterly_sales} onChange={e => set("fee_quarterly_sales", e.target.value)} placeholder="2000" /></Field>
      </Row2>

      <Row2>
        <Field label="Assigned to">
          <SelectInput value={f.assigned_to} onChange={e => set("assigned_to", e.target.value)}>
            <option value="">— koi nahi —</option>
            {staff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </SelectInput>
        </Field>
        <Field label="Business type" hint="GST followup ki last date isi se: B2B=13, baaki=20">
          <SelectInput value={f.business_type} onChange={e => set("business_type", e.target.value)}>
            {BUSINESS_TYPES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
          </SelectInput>
        </Field>
      </Row2>

      <Field label="Linked customer accounts (same banda, doosre GSTIN)"
        hint="Group me se KISI EK ko select karo — poore group se apne aap link ho jayega.">
        <select multiple size={4} value={linked}
          onChange={e => setLinked([...e.target.selectedOptions].map(o => o.value))}
          className="w-full px-2.5 py-2 border border-[#E6E4DD] rounded-lg text-[13px] outline-none focus:border-[#0F6E56] bg-white">
          {clients.filter(o => o.id !== client?.id).map(o => (
            <option key={o.id} value={o.id}>{o.name} — {o.business_name || o.gstin || "—"}</option>
          ))}
        </select>
      </Field>

      <div className="flex gap-2 justify-end mt-5">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Saving..." : editing ? "Save changes" : "Add client"}</Btn>
      </div>
    </Modal>
  );
}
