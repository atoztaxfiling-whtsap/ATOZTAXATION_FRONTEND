/* Followups — bot ke apne aap lage hue aur tumhare khud ke set kiye, dono */
import { useState } from "react";
import { Check, Plus, Bot, User, AlertTriangle, IndianRupee } from "lucide-react";
import { useCrm } from "../../services/crmStore";
import { updateClient, closeFollowup, closeEscalation, confirmPaymentClaim, rejectPaymentClaim } from "../../services/crmApi";
import { balanceDue, money, type Client } from "../../services/crmLogic";
import { Avatar, Panel, PageHead, Btn, Modal, Field, TextInput, SelectInput, Pill } from "./ui";
import ClientDrawer from "./ClientDrawer";

const QUICK = ["Aaj shaam", "Kal subah", "Kal shaam", "Parso", "Is hafte"];

function whenText(iso?: string | null) {
  if (!iso) return "Jald";
  const d = new Date(iso);
  const now = new Date();
  const days = Math.round((d.setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 86400000);
  const label = days < 0 ? "Beet gaya" : days === 0 ? "Aaj" : days === 1 ? "Kal" : days === 2 ? "Parso" : new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return `${label}, ${new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
}

export default function Followups() {
  const { clients, followups, escalations, filingMap, payments, tasks, reload, loading, toast } = useCrm();
  const [open, setOpen] = useState<Client | null>(null);
  const [adding, setAdding] = useState(false);
  const [claimFor, setClaimFor] = useState<Client | null>(null);

  const byId = (id?: string | null) => clients.find(c => c.id === id) || null;

  // Payment claims alag — inpe Confirm/Nahi ka button chahiye
  const claims = followups
    .filter(f => f.kind === "payment_claim")
    .map(f => ({ f, c: byId(f.client_id) }))
    .filter(x => x.c);

  // Bot ke lagaye baaki followups
  const botRows = followups
    .filter(f => f.kind !== "payment_claim")
    .map(f => ({ f, c: byId(f.client_id) }))
    .filter(x => x.c)
    .sort((a, b) => (a.f.planned_at || "").localeCompare(b.f.planned_at || ""));

  // Tumhare khud ke (client card pe likha hua), jinka koi bot followup nahi hai
  const botClientIds = new Set(followups.map(f => f.client_id));
  const manualRows = clients.filter(c => c.followup_text && !botClientIds.has(c.id));

  async function markManualDone(c: Client) {
    await updateClient(c.id, { followup_text: null });
    toast(`${c.name} ka followup done`, async () => { await updateClient(c.id, { followup_text: c.followup_text }); });
    await reload();
  }
  async function markBotDone(id: string, name: string) {
    await closeFollowup(id);
    toast(`${name} ka followup done`);
    await reload();
  }

  const total = botRows.length + manualRows.length;

  return (
    <div className="h-full overflow-y-auto bg-[#F6F5F1] p-5 md:p-7">
      <PageHead title="Followups" sub="Bot ke apne aap lage hue aur tumhare khud ke, dono yahan"
        actions={<Btn variant="primary" onClick={() => setAdding(true)}><Plus className="w-3.5 h-3.5" />Naya followup</Btn>} />

      {!!claims.length && (
        <>
          <h2 className="text-[14.5px] font-semibold mb-3 flex items-center gap-1.5">
            <IndianRupee className="w-4 h-4 text-[#0F6E56]" />Payment confirm karna hai
          </h2>
          <Panel>
            {claims.map(({ f, c }) => {
              const bal = balanceDue(c!, filingMap, payments, tasks);
              return (
                <div key={f.id} className="flex items-start gap-3.5 px-4 py-3 border-b border-[#E6E4DD] last:border-0 flex-wrap">
                  <Avatar name={c!.name} onClick={() => setOpen(c!)} />
                  <div className="flex-1 min-w-[180px]">
                    <div className="text-[13.5px] font-medium">{c!.name}</div>
                    <div className="text-[12.5px] text-[#6B6F68] break-words">
                      Client ne bola: "{f.note || "payment kar diya"}"
                    </div>
                    <div className="text-[11.5px] text-[#9BA098] mt-0.5">
                      CRM me balance: <b className={bal > 0 ? "text-[#A32D2D]" : "text-[#0F6E56]"}>{bal > 0 ? money(bal) : "clear"}</b>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Btn size="sm" variant="primary" onClick={() => setClaimFor(c!)}>Paisa aa gaya</Btn>
                    <Btn size="sm" onClick={async () => { await rejectPaymentClaim(c!.mobile); toast("Theek hai, followup chalta rahega"); await reload(); }}>Nahi aaya</Btn>
                  </div>
                </div>
              );
            })}
          </Panel>
          <div className="h-5" />
        </>
      )}

      {!!escalations.length && (
        <>
          <h2 className="text-[14.5px] font-semibold mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-[#BA7517]" />Tumhara jawab chahiye
          </h2>
          <Panel>
            {escalations.map(e => {
              const c = byId(e.client_id);
              return (
                <div key={e.id} className="flex items-start gap-3.5 px-4 py-3 border-b border-[#E6E4DD] last:border-0">
                  <Avatar name={c?.name || e.mobile} onClick={() => c && setOpen(c)} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-medium">{c?.name || e.mobile}</div>
                    <div className="text-[12.5px] text-[#6B6F68] break-words">{e.question}</div>
                    {e.reason && <div className="text-[11.5px] text-[#9BA098] mt-0.5">{e.reason}</div>}
                  </div>
                  <Btn size="sm" onClick={async () => { await closeEscalation(e.id); toast("Nipta diya"); await reload(); }}>Ho gaya</Btn>
                </div>
              );
            })}
          </Panel>
          <div className="h-5" />
        </>
      )}

      <h2 className="text-[14.5px] font-semibold mb-3">Pending followups {total > 0 && <span className="text-[#9BA098] font-normal">({total})</span>}</h2>
      <Panel>
        {loading && <div className="px-4 py-5 text-[12.5px] text-[#9BA098]">Load ho raha hai...</div>}
        {!loading && !total && <div className="px-4 py-5 text-[12.5px] text-[#9BA098]">Kuch pending nahi.</div>}

        {botRows.map(({ f, c }) => (
          <div key={f.id} className="flex items-center gap-3.5 px-4 py-3 border-b border-[#E6E4DD] last:border-0">
            <button onClick={() => markBotDone(f.id, c!.name)}
              className="w-6 h-6 rounded-full border-[1.5px] border-[#E6E4DD] hover:border-[#0F6E56] text-transparent hover:text-[#0F6E56] flex items-center justify-center flex-shrink-0">
              <Check className="w-3.5 h-3.5" />
            </button>
            <div className="w-28 flex-shrink-0 text-[12px] text-[#6B6F68] font-mono">{whenText(f.planned_at)}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-medium truncate flex items-center gap-1.5">
                {c!.name}
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#E6F1FB] text-[#185FA5] text-[10px] font-semibold">
                  <Bot className="w-2.5 h-2.5" />bot
                </span>
              </div>
              <div className="text-[12.5px] text-[#6B6F68] truncate">{f.note || c!.business_name || c!.mobile}</div>
            </div>
            <Btn size="sm" onClick={() => setOpen(c!)}>Open</Btn>
          </div>
        ))}

        {manualRows.map(c => (
          <div key={c.id} className="flex items-center gap-3.5 px-4 py-3 border-b border-[#E6E4DD] last:border-0">
            <button onClick={() => markManualDone(c)}
              className="w-6 h-6 rounded-full border-[1.5px] border-[#E6E4DD] hover:border-[#0F6E56] text-transparent hover:text-[#0F6E56] flex items-center justify-center flex-shrink-0">
              <Check className="w-3.5 h-3.5" />
            </button>
            <div className="w-28 flex-shrink-0 text-[12px] text-[#6B6F68] font-mono">{c.followup_text}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-medium truncate flex items-center gap-1.5">
                {c.name}
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#E1F5EE] text-[#04342C] text-[10px] font-semibold">
                  <User className="w-2.5 h-2.5" />mera
                </span>
              </div>
              <div className="text-[12.5px] text-[#6B6F68] truncate">{c.business_name || c.mobile} · {c.assigned_to || "—"}</div>
            </div>
            <Btn size="sm" onClick={() => setOpen(c)}>Open</Btn>
          </div>
        ))}
      </Panel>

      {claimFor && <ConfirmClaim client={claimFor} onClose={() => setClaimFor(null)} />}
      {adding && <AddFollowup onClose={() => setAdding(false)} />}
      {open && <ClientDrawer client={clients.find(c => c.id === open.id) || open} onClose={() => setOpen(null)} />}
      <div className="h-8" />
    </div>
  );
}

function ConfirmClaim({ client, onClose }: { client: Client; onClose: () => void }) {
  const { filingMap, payments, tasks, reload, toast } = useCrm();
  const bal = Math.round(balanceDue(client, filingMap, payments, tasks));
  const [amount, setAmount] = useState(bal > 0 ? String(bal) : "");
  const [method, setMethod] = useState("UPI");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function go() {
    const amt = Number(amount);
    if (!amt || amt <= 0) { setErr("Amount daalo"); return; }
    setSaving(true); setErr("");
    try {
      const r = await confirmPaymentClaim(client.mobile, amt, method);
      toast(`${money(r.amount)} chadh gaya` + (r.balance_left > 0 ? ` · ${money(r.balance_left)} baaki` : " · balance clear"));
      await reload(); onClose();
    } catch (e) { setErr((e as Error).message); setSaving(false); }
  }

  return (
    <Modal title="Payment confirm karo" sub={`${client.name} — kitna paisa aaya?`} onClose={onClose}>
      {err && <div className="bg-[#FCEBEB] text-[#501313] text-[12.5px] rounded-lg px-3 py-2 mb-3">{err}</div>}
      <Field label="Amount (₹)" hint={bal > 0 ? `Poora balance ${money(bal)} hai. Aadha aaya ho to badal do.` : "Is client ka balance clear hai, phir bhi entry kar sakte ho."}>
        <TextInput type="number" value={amount} onChange={e => setAmount(e.target.value)} />
      </Field>
      <Field label="Kaise aaya">
        <SelectInput value={method} onChange={e => setMethod(e.target.value)}>
          <option>UPI</option><option>Cash</option><option>Bank</option>
        </SelectInput>
      </Field>
      <div className="flex gap-2 justify-end mt-4">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={go} disabled={saving}>{saving ? "Chadha raha..." : "Confirm karo"}</Btn>
      </div>
    </Modal>
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
