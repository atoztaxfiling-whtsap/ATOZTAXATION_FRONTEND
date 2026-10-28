/* Intern assistant — kisi customer ke baare me Claude se doubt poochho.
   Claude ko us customer ka CRM record + chat + doc-list context milta hai
   (secrets nahi). Read-only: sirf guide karta, CRM change nahi. */
import { useState } from "react";
import { useCrm } from "../../services/crmStore";
import { askAssistant } from "../../services/crmApi";
import { PageHead } from "./ui";

type Msg = { role: "user" | "assistant"; content: string };

export default function Assistant() {
  const { clients } = useCrm();
  const [cid, setCid] = useState("");
  const [model, setModel] = useState("claude-sonnet-4-6");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const sorted = [...clients].sort((a, b) => a.name.localeCompare(b.name));
  const client = clients.find(c => c.id === cid);

  function pick(id: string) { setCid(id); setMsgs([]); }

  async function send() {
    const q = input.trim();
    if (!q || busy || !client) return;
    const next: Msg[] = [...msgs, { role: "user", content: q }];
    setMsgs(next); setInput(""); setBusy(true);
    try {
      const reply = await askAssistant(client.mobile, model, next);
      setMsgs(m => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      setMsgs(m => [...m, { role: "assistant", content: "⚠ " + (e as Error).message }]);
    } finally { setBusy(false); }
  }

  return (
    <div className="h-full flex flex-col bg-[#F5F7F6]">
      <div className="p-5 md:p-7 pb-0">
        <PageHead title="Assistant" sub="Customer ke baare me doubt poochho — Claude uska record + chat dekh ke batayega" />
        <div className="flex flex-wrap gap-2 mb-3">
          <select value={cid} onChange={e => pick(e.target.value)}
            className="px-3 py-2 border border-[#E4E8E6] rounded-lg text-[13px] bg-white min-w-[220px]">
            <option value="">— customer chuno —</option>
            {sorted.map(c => <option key={c.id} value={c.id}>{c.name}{c.business_name ? ` · ${c.business_name}` : ""}</option>)}
          </select>
          <select value={model} onChange={e => setModel(e.target.value)}
            className="px-3 py-2 border border-[#E4E8E6] rounded-lg text-[13px] bg-white">
            <option value="claude-sonnet-4-6">Sonnet — accurate</option>
            <option value="claude-haiku-4-5-20251001">Haiku — fast/sasta</option>
          </select>
          {client && !!msgs.length && <button onClick={() => setMsgs([])} className="px-3 py-2 text-[12.5px] text-[#5E6B66] border border-[#E4E8E6] rounded-lg bg-white">Naya</button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 md:px-7 pb-4">
        {!client && <div className="text-[13px] text-[#8A948F] mt-6">Pehle upar se customer chuno, phir doubt poochho.</div>}
        {client && !msgs.length && (
          <div className="text-[13px] text-[#8A948F] mt-6">
            <b className="text-[#16211D]">{client.name}</b> chuna. Ab poochho — jaise:
            "iska kitna paisa baaki hai?", "GST pending kya hai?", "isne kya documents bheje?", "last baat kya hui thi?"
          </div>
        )}
        <div className="max-w-[760px] mx-auto space-y-3 mt-3">
          {msgs.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={`rounded-2xl px-3.5 py-2.5 text-[13.5px] whitespace-pre-wrap max-w-[85%] ${m.role === "user" ? "bg-[#0E7A52] text-white" : "bg-white border border-[#E4E8E6] text-[#16211D]"}`}>{m.content}</div>
            </div>
          ))}
          {busy && <div className="flex justify-start"><div className="rounded-2xl px-3.5 py-2.5 text-[13px] bg-white border border-[#E4E8E6] text-[#8A948F]">soch raha…</div></div>}
        </div>
      </div>

      <div className="border-t border-[#E4E8E6] bg-white p-3 md:px-7">
        <div className="max-w-[760px] mx-auto flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") send(); }}
            disabled={!client || busy} placeholder={client ? "Doubt likho…" : "Pehle customer chuno"}
            className="flex-1 px-3.5 py-2.5 border border-[#E4E8E6] rounded-lg text-[13.5px] outline-none focus:border-[#0E7A52] disabled:bg-[#F5F7F6]" />
          <button onClick={send} disabled={!client || busy || !input.trim()}
            className="px-4 py-2.5 rounded-lg bg-[#0E7A52] text-white text-[13.5px] font-medium disabled:opacity-40 whitespace-nowrap">Poochho</button>
        </div>
      </div>
    </div>
  );
}
