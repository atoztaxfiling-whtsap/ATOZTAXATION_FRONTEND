/* Client drawer — ledger, logins, payments, templates, notes (demo jaisa) */
import { useState } from "react";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { useCrm } from "../../services/crmStore";
import { updateClient, deleteClient, restoreClient, createPayment, addClientNote, deleteClientNote } from "../../services/crmApi";
import {
  fullLedger, currentCycle, currentPeriod, rateFor, tasksForClient,
  totalFirmPaid, TEMPLATES, waLink, money, type Client,
} from "../../services/crmLogic";
import { Drawer, Avatar, Pill, Btn, TextInput, SelectInput } from "./ui";
import ClientForm from "./ClientForm";

export default function ClientDrawer({ client, onClose }: { client: Client; onClose: () => void }) {
  const { filingMap, payments, tasks, notes, reload, toast } = useCrm();
  const [editing, setEditing] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showOther, setShowOther] = useState<Record<number, boolean>>({});
  const [addLogin, setAddLogin] = useState(false);
  const [ol, setOl] = useState({ label: "", username: "", password: "" });
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("UPI");
  const [payKind, setPayKind] = useState<"client" | "firm_paid">("client");
  const [payNote, setPayNote] = useState("");
  const [tpl, setTpl] = useState(TEMPLATES[0].id);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const c = client;
  const led = fullLedger(c, filingMap, payments, tasks);
  const rows = led.periods;
  const bal = led.balance;
  const firmPaidTotal = totalFirmPaid(payments, c.id);
  const cyc = currentCycle(c);
  const cp = currentPeriod(c);
  const myPayments = payments.filter(p => p.client_id === c.id);
  const myTasks = tasksForClient(tasks, c.id);
  const myNotes = notes.filter(n => n.client_id === c.id);
  const logins = c.other_logins || [];

  async function saveLogins(next: typeof logins) {
    await updateClient(c.id, { other_logins: next });
    await reload();
  }

  async function record() {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    setBusy(true);
    try {
      await createPayment({ client_id: c.id, amount: amt, method, kind: payKind, note: payNote.trim() || undefined });
      setAmount(""); setPayNote("");
      toast(payKind === "firm_paid"
        ? `${money(amt)} humne bhara — client ke balance me jud gaya`
        : `${money(amt)} record ho gaya`);
      await reload();
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  }

  async function saveNote() {
    if (!note.trim()) return;
    await addClientNote(c.id, note.trim()); setNote(""); await reload();
  }

  async function removeClient() {
    if (!confirm(`${c.name} ko delete karna hai? Filings aur payments bhi list se hat jayenge.`)) return;
    await deleteClient(c.id);
    toast(`${c.name} hata diya gaya`, async () => { await restoreClient(c.id); });
    await reload();
    onClose();
  }

  async function clearFollowup() {
    await updateClient(c.id, { followup_text: null }); await reload();
  }

  const tplText = () => {
    const t = TEMPLATES.find(x => x.id === tpl)!;
    return t.text(c, { balance: bal, period: cp?.label || "" });
  };

  const Section = ({ title, action }: { title: string; action?: React.ReactNode }) => (
    <div className="flex items-center justify-between text-[12px] font-semibold uppercase tracking-wide text-[#6B6F68] mt-5 mb-2">
      <span>{title}</span>{action}
    </div>
  );

  return (
    <>
      <Drawer onClose={onClose}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <Avatar name={c.name} size={52} />
            <div className="text-[18px] font-semibold mt-2.5">{c.name}</div>
            <div className="text-[13px] text-[#6B6F68]">{c.business_name || "—"}</div>
            <div className="flex gap-1.5 mt-2.5 flex-wrap">
              <Pill status={cyc === "quarterly" ? "Quarterly now" : "Monthly now"}>{cyc === "quarterly" ? "Quarterly now" : "Monthly now"}</Pill>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11.5px] font-medium bg-[#FAEEDA] text-[#412402]">
                Nil {money(rateFor(c, cyc, "nil"))} · Sales {money(rateFor(c, cyc, "sales"))}
              </span>
            </div>
          </div>
          <div className="flex gap-1.5">
            <Btn size="sm" onClick={() => setEditing(true)}>Edit</Btn>
            <Btn size="sm" onClick={onClose}>✕</Btn>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 my-4">
          <Info label="GSTIN" value={c.gstin || "—"} />
          <Info label="Username" value={c.portal_username || "—"} />
          <Info label="Phone" value={c.mobile || "—"} />
          <Info label="Assigned to" value={c.assigned_to || "—"} mono={false} />
          <div className="col-span-2 bg-[#F6F5F1] rounded-lg px-3 py-2.5 flex items-center justify-between">
            <div>
              <div className="text-[10.5px] text-[#6B6F68] uppercase tracking-wide mb-0.5">Password</div>
              <div className="text-[13px] font-medium font-mono break-all">{showPw ? (c.portal_password || "—") : "••••••••"}</div>
            </div>
            <Btn size="sm" onClick={() => setShowPw(v => !v)}>{showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}{showPw ? "Hide" : "Show"}</Btn>
          </div>
        </div>

        {!!(c.linked_client_ids || []).length && <LinkedList ids={c.linked_client_ids!} />}

        <Section title="Other portal logins" action={<Btn size="sm" onClick={() => setAddLogin(v => !v)}><Plus className="w-3 h-3" />Add</Btn>} />
        {logins.length === 0 && !addLogin && <div className="text-[12.5px] text-[#9BA098]">Koi aur login add nahi kiya.</div>}
        {logins.map((l, i) => (
          <div key={i} className="bg-[#F6F5F1] rounded-lg px-3 py-2 flex items-center justify-between mb-1.5">
            <div className="min-w-0">
              <div className="text-[10.5px] text-[#6B6F68] uppercase tracking-wide">{l.label}</div>
              <div className="text-[12.5px] font-mono break-all">{l.username} · {showOther[i] ? l.password : "••••••••"}</div>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <Btn size="sm" onClick={() => setShowOther(p => ({ ...p, [i]: !p[i] }))}>{showOther[i] ? "Hide" : "Show"}</Btn>
              <Btn size="sm" variant="danger" onClick={() => saveLogins(logins.filter((_, x) => x !== i))}>×</Btn>
            </div>
          </div>
        ))}
        {addLogin && (
          <div className="flex gap-1.5 mt-2">
            <TextInput placeholder="Portal (E-way Bill...)" value={ol.label} onChange={e => setOl({ ...ol, label: e.target.value })} className="max-w-[110px]" />
            <TextInput placeholder="Username" value={ol.username} onChange={e => setOl({ ...ol, username: e.target.value })} />
            <TextInput placeholder="Password" value={ol.password} onChange={e => setOl({ ...ol, password: e.target.value })} />
            <Btn size="sm" variant="primary" onClick={async () => {
              if (!ol.username) return;
              await saveLogins([...logins, { label: ol.label || "Portal", username: ol.username, password: ol.password }]);
              setOl({ label: "", username: "", password: "" }); setAddLogin(false);
            }}>Add</Btn>
          </div>
        )}

        <Section title="Ledger" />
        <table className="w-full text-[11.5px]">
          <thead><tr className="text-[10px] text-[#6B6F68] uppercase">
            <th className="text-left py-1 border-b border-[#E6E4DD]">Period</th>
            <th className="text-left py-1 border-b border-[#E6E4DD]">Type</th>
            <th className="text-left py-1 border-b border-[#E6E4DD]">Status</th>
            <th className="text-right py-1 border-b border-[#E6E4DD]">Due</th>
            <th className="text-right py-1 border-b border-[#E6E4DD]">Balance</th>
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.key} className="font-mono">
                <td className="py-1.5 border-b border-[#E6E4DD]">{r.period}</td>
                <td className="py-1.5 border-b border-[#E6E4DD]">{r.type === "sales" ? "Sales" : "Nil"}</td>
                <td className="py-1.5 border-b border-[#E6E4DD] font-sans text-[11px]">{r.status}</td>
                <td className={`py-1.5 border-b border-[#E6E4DD] text-right ${r.billable ? "" : "text-[#9BA098]"}`}
                  title={r.billable ? "" : "Kaam poora nahi hua — abhi due nahi"}>
                  {money(r.fullDue)}{r.billable ? "" : "*"}
                </td>
                <td className={`py-1.5 border-b border-[#E6E4DD] text-right ${r.balance > 0 ? "text-[#A32D2D]" : "text-[#0F6E56]"}`}>{money(r.balance)}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="py-3 text-[#9BA098]">Abhi koi period nahi bana.</td></tr>}
          </tbody>
        </table>

        {rows.some(r => !r.billable) && (
          <div className="text-[10.5px] text-[#9BA098] mt-1">
            * kaam abhi poora nahi hua — ye amount "baaki" me nahi ginta. Status
            "Completed" hote hi due ban jayega.
          </div>
        )}

        {!!led.advances.length && (
          <>
            <Section title="Humne client ke liye bhara" />
            <table className="w-full text-[11.5px]">
              <thead><tr className="text-[10px] text-[#6B6F68] uppercase">
                <th className="text-left py-1 border-b border-[#E6E4DD]">Date</th>
                <th className="text-left py-1 border-b border-[#E6E4DD]">Kis liye</th>
                <th className="text-right py-1 border-b border-[#E6E4DD]">Bhara</th>
                <th className="text-right py-1 border-b border-[#E6E4DD]">Baaki</th>
              </tr></thead>
              <tbody>
                {led.advances.map(a => (
                  <tr key={a.id} className="font-mono">
                    <td className="py-1.5 border-b border-[#E6E4DD]">{a.on || "—"}</td>
                    <td className="py-1.5 border-b border-[#E6E4DD] font-sans">{a.note || "—"}</td>
                    <td className="py-1.5 border-b border-[#E6E4DD] text-right">{money(a.due)}</td>
                    <td className={`py-1.5 border-b border-[#E6E4DD] text-right ${a.balance > 0 ? "text-[#A32D2D]" : "text-[#0F6E56]"}`}>{money(a.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-[10.5px] text-[#9BA098] py-1">
              Kul {money(firmPaidTotal)} humne bhara hai. Ye client se lena hai.
            </div>
          </>
        )}

        <div className="flex items-center justify-between bg-[#F6F5F1] rounded-lg px-3 py-2.5 mt-2.5">
          <span className="text-[12px] text-[#6B6F68]">Total balance due</span>
          <span className={`font-mono font-semibold text-[15px] ${bal > 0 ? "text-[#A32D2D]" : "text-[#0F6E56]"}`}>{bal > 0 ? money(bal) : "Clear"}</span>
        </div>

        <div className="flex gap-1 mt-2.5 mb-1.5">
          <button onClick={() => setPayKind("client")}
            className={`flex-1 px-2 py-1.5 rounded-lg text-[11.5px] font-medium border transition ${payKind === "client"
              ? "bg-[#0F6E56] text-white border-[#0F6E56]"
              : "bg-white text-[#6B6F68] border-[#E6E4DD] hover:bg-[#FBFAF7]"}`}>
            Client ne diya
          </button>
          <button onClick={() => setPayKind("firm_paid")}
            className={`flex-1 px-2 py-1.5 rounded-lg text-[11.5px] font-medium border transition ${payKind === "firm_paid"
              ? "bg-[#A35A17] text-white border-[#A35A17]"
              : "bg-white text-[#6B6F68] border-[#E6E4DD] hover:bg-[#FBFAF7]"}`}>
            Humne bhara
          </button>
        </div>

        <div className="flex gap-1.5">
          <TextInput type="number"
            placeholder={payKind === "firm_paid" ? "Kitna bhara (₹)" : "Amount received (₹)"}
            value={amount} onChange={e => setAmount(e.target.value)} />
          <SelectInput value={method} onChange={e => setMethod(e.target.value)} className="max-w-[90px]"><option>UPI</option><option>Cash</option><option>Bank</option></SelectInput>
          <Btn size="sm" variant="primary" onClick={record} disabled={busy}>Record</Btn>
        </div>

        {payKind === "firm_paid" && (
          <>
            <div className="mt-1.5">
              <TextInput value={payNote} onChange={e => setPayNote(e.target.value)}
                placeholder="Kis liye bhara? (late fee, GST challan, ITR tax...)" />
            </div>
            <div className="text-[10.5px] text-[#A35A17] mt-1">
              Ye client ke balance me <b>jud jayega</b> — matlab isse client par
              udhaar chadhega. Client jab paisa dega to sabse pehle purane period
              clear honge, phir ye.
            </div>
          </>
        )}

        {!!myPayments.length && (
          <div className="mt-2 max-h-32 overflow-y-auto">
            {myPayments.slice().reverse().map(p => (
              <div key={p.id} className="flex items-center justify-between text-[11.5px] py-1 border-b border-[#E6E4DD]">
                <span className="font-mono">{money(Number(p.amount))} · {p.method || "—"} · {p.paid_on}</span>
                {(p.kind || "client") === "firm_paid" && (
                  <span className="text-[10px] font-medium text-[#A35A17] bg-[#FFF6E8] border border-[#F2DFBE] rounded px-1.5 py-0.5">
                    humne bhara
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {!!myTasks.length && (
          <>
            <Section title="One-off work (Workflow se)" />
            <table className="w-full text-[11.5px]">
              <thead><tr className="text-[10px] text-[#6B6F68] uppercase">
                <th className="text-left py-1 border-b border-[#E6E4DD]">Task</th>
                <th className="text-right py-1 border-b border-[#E6E4DD]">Agreed</th>
                <th className="text-right py-1 border-b border-[#E6E4DD]">Paid</th>
                <th className="text-right py-1 border-b border-[#E6E4DD]">Balance</th>
              </tr></thead>
              <tbody>
                {myTasks.map(t => {
                  const b = (Number(t.fee_agreed) || 0) - (Number(t.amount_paid) || 0);
                  return (
                    <tr key={t.id} className="font-mono">
                      <td className="py-1.5 border-b border-[#E6E4DD] font-sans">{t.name}</td>
                      <td className="py-1.5 border-b border-[#E6E4DD] text-right">{money(Number(t.fee_agreed) || 0)}</td>
                      <td className="py-1.5 border-b border-[#E6E4DD] text-right">{money(Number(t.amount_paid) || 0)}</td>
                      <td className={`py-1.5 border-b border-[#E6E4DD] text-right ${b > 0 ? "text-[#A32D2D]" : "text-[#0F6E56]"}`}>{money(b)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="text-[11.5px] text-[#9BA098] py-1.5">
              Ye amounts Workflow tab se edit hote hain. Fee tabhi "baaki" me
              ginti hai jab task Completed / Payment Pending ho.
            </div>
          </>
        )}

        <Section title="Followup" />
        {c.followup_text ? (
          <div className="flex items-center gap-3 py-2">
            <span className="font-mono text-[12px] text-[#6B6F68]">{c.followup_text}</span>
            <span className="text-[12.5px] text-[#6B6F68] flex-1">Pending</span>
            <Btn size="sm" onClick={clearFollowup}>Mark done</Btn>
          </div>
        ) : <div className="text-[12.5px] text-[#9BA098]">Koi followup pending nahi.</div>}

        <Section title="Quick message" />
        <div className="flex gap-1.5">
          <SelectInput value={tpl} onChange={e => setTpl(e.target.value)}>{TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</SelectInput>
          <a href={waLink(c.mobile, tplText())} target="_blank" rel="noreferrer"
            className="inline-flex items-center px-3 py-1 text-[12px] font-medium rounded-lg bg-[#1C1E1B] text-white whitespace-nowrap">WhatsApp</a>
        </div>

        <Section title="Activity notes" />
        <div className="flex gap-1.5">
          <TextInput placeholder="Note likho (call kiya, docs mangwaye...)" value={note} onChange={e => setNote(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") saveNote(); }} />
          <Btn size="sm" onClick={saveNote}>Add</Btn>
        </div>
        <div className="mt-2 max-h-44 overflow-y-auto">
          {myNotes.length ? myNotes.map(n => (
            <div key={n.id} className="flex items-start gap-2 py-1.5 border-b border-[#E6E4DD] group">
              <div className="w-1.5 h-1.5 rounded-full bg-[#0F6E56] mt-1.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px]">{n.text}</div>
                <div className="text-[11px] text-[#9BA098]">{new Date(n.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
              </div>
              <button onClick={async () => { await deleteClientNote(c.id, n.id); await reload(); }}
                className="opacity-0 group-hover:opacity-100 text-[#9BA098] hover:text-[#A32D2D]"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          )) : <div className="text-[12.5px] text-[#9BA098] py-1">Abhi koi note nahi.</div>}
        </div>

        <Section title="Danger zone" />
        <Btn size="sm" variant="danger" onClick={removeClient}>Delete client</Btn>
        <div className="h-6" />
      </Drawer>

      {editing && <ClientForm client={c} onClose={() => setEditing(false)} />}
    </>
  );
}

function Info({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-[#F6F5F1] rounded-lg px-3 py-2.5">
      <div className="text-[10.5px] text-[#6B6F68] uppercase tracking-wide mb-0.5">{label}</div>
      <div className={`text-[13px] font-medium break-all ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function LinkedList({ ids }: { ids: string[] }) {
  const { clients } = useCrm();
  const linked = ids.map(id => clients.find(c => c.id === id)).filter(Boolean) as Client[];
  if (!linked.length) return null;
  return (
    <>
      <div className="text-[12px] font-semibold uppercase tracking-wide text-[#6B6F68] mt-5 mb-2">Other businesses — same customer</div>
      {linked.map(o => (
        <div key={o.id} className="flex items-center gap-2.5 py-1.5">
          <Avatar name={o.name} size={28} />
          <div className="min-w-0"><div className="text-[13px] font-medium">{o.name}</div><div className="text-[11.5px] text-[#6B6F68] truncate">{o.business_name || "—"} · {o.gstin || "—"}</div></div>
        </div>
      ))}
    </>
  );
}
