/* Followups — jinke followup set hain, aur naya followup set karna */
import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { useCrm } from "../../services/crmStore";
import { updateClient } from "../../services/crmApi";
import { type Client } from "../../services/crmLogic";
import { Avatar, Panel, PageHead, Btn, Modal, Field, TextInput, SelectInput } from "./ui";
import ClientDrawer from "./ClientDrawer";

const QUICK = ["Aaj shaam", "Kal subah", "Kal shaam", "Parso", "Is hafte"];

export default function Followups() {
  const { clients, reload, loading, toast } = useCrm();
  const [open, setOpen] = useState<Client | null>(null);
  const [adding, setAdding] = useState(false);

  const list = clients.filter(c => c.followup_text);

  async function markDone(c: Client) {
    await updateClient(c.id, { followup_text: null });
    toast(`${c.name} ka followup done`, async () => { await updateClient(c.id, { followup_text: c.followup_text }); });
    await reload();
  }

  return (
    <div className="h-full overflow-y-auto bg-[#F6F5F1] p-5 md:p-7">
      <PageHead title="Followups" sub="Jo bhi yaad rakhna hai, yahan"
        actions={<Btn variant="primary" onClick={() => setAdding(true)}><Plus className="w-3.5 h-3.5" />Naya followup</Btn>} />

      <Panel>
        {loading && <div className="px-4 py-5 text-[12.5px] text-[#9BA098]">Load ho raha hai...</div>}
        {!loading && !list.length && <div className="px-4 py-5 text-[12.5px] text-[#9BA098]">Kuch pending nahi.</div>}
        {list.map(c => (
          <div key={c.id} className="flex items-center gap-3.5 px-4 py-3 border-b border-[#E6E4DD] last:border-0">
            <button onClick={() => markDone(c)}
              className="w-6 h-6 rounded-full border-[1.5px] border-[#E6E4DD] hover:border-[#0F6E56] text-transparent hover:text-[#0F6E56] flex items-center justify-center flex-shrink-0">
              <Check className="w-3.5 h-3.5" />
            </button>
            <div className="w-24 flex-shrink-0 text-[12px] text-[#6B6F68] font-mono">{c.followup_text}</div>
            <div className="flex-1 min-w-0"><div className="text-[13.5px] font-medium truncate">{c.name}</div>
              <div className="text-[12.5px] text-[#6B6F68] truncate">{c.business_name || c.mobile} · {c.assigned_to || "—"}</div></div>
            <Btn size="sm" onClick={() => setOpen(c)}>Open</Btn>
          </div>
        ))}
      </Panel>

      {adding && <AddFollowup onClose={() => setAdding(false)} />}
      {open && <ClientDrawer client={clients.find(c => c.id === open.id) || open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function AddFollowup({ onClose }: { onClose: () => void }) {
  const { clients, reload, toast } = useCrm();
  const [cid, setCid] = useState("");
  const [when, setWhen] = useState("Aaj shaam");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!cid || !when.trim()) return;
    setSaving(true);
    try { await updateClient(cid, { followup_text: when.trim() }); toast("Followup lag gaya"); await reload(); onClose(); }
    catch (e) { alert((e as Error).message); setSaving(false); }
  }

  return (
    <Modal title="Naya followup" sub="Kis client ka, aur kab" onClose={onClose}>
      <Field label="Client">
        <SelectInput value={cid} onChange={e => setCid(e.target.value)}>
          <option value="">— select karo —</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.business_name || c.mobile}</option>)}
        </SelectInput>
      </Field>
      <Field label="Kab" hint="Apne shabdon me likh sakte ho, jaise 'Kal 11 baje'">
        <TextInput value={when} onChange={e => setWhen(e.target.value)} />
      </Field>
      <div className="flex gap-1.5 flex-wrap mb-3">
        {QUICK.map(q => <button key={q} onClick={() => setWhen(q)} className="px-2.5 py-1 rounded-full border border-[#E6E4DD] bg-white text-[12px] text-[#6B6F68] hover:border-[#0F6E56]">{q}</button>)}
      </div>
      <div className="flex gap-2 justify-end">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={save} disabled={saving || !cid}>{saving ? "Saving..." : "Set karo"}</Btn>
      </div>
    </Modal>
  );
}
