/* Bot Note — per-client/walk-in note jo bot poora context maanta hai.
   Client drawer aur Workflow (walk-in) task edit, dono me use hota hai. */
import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { fetchBotNotes, addBotNote, deleteBotNote, type BotNote } from "../../services/crmApi";
import { Btn, TextInput } from "./ui";

export default function BotNotes({ mobile }: { mobile: string }) {
  const [notes, setNotes] = useState<BotNote[]>([]);
  const [txt, setTxt] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => { if (mobile) fetchBotNotes(mobile).then(setNotes).catch(() => {}); };
  useEffect(load, [mobile]);

  const add = async () => {
    if (!txt.trim() || !mobile) return;
    setBusy(true);
    try { await addBotNote(mobile, txt.trim()); setTxt(""); load(); } finally { setBusy(false); }
  };
  const del = async (id: string) => { await deleteBotNote(mobile, id); load(); };

  return (
    <div className="mt-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[#0F6E56] mb-2 flex items-center gap-1.5">
        🤖 Bot Note
        <span className="text-[#9BA098] font-normal normal-case">(bot ise padhega — call pe suni baat likho)</span>
      </div>
      {!mobile ? (
        <div className="text-[12.5px] text-[#9BA098]">Phone number daalo tabhi bot-note laga sakte ho.</div>
      ) : (
        <>
          <div className="flex gap-1.5">
            <TextInput placeholder="Jaise: Food License bhi chahiye / Monday payment dega"
              value={txt} onChange={e => setTxt(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") add(); }} />
            <Btn size="sm" onClick={add} disabled={busy}>Add</Btn>
          </div>
          <div className="mt-2 max-h-40 overflow-y-auto">
            {notes.length ? notes.map(n => (
              <div key={n.id} className="flex items-start gap-2 py-1.5 border-b border-[#E6E4DD] group">
                <div className="w-1.5 h-1.5 rounded-full bg-[#0F6E56] mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px]">{n.note}</div>
                  <div className="text-[11px] text-[#9BA098]">
                    {n.created_at ? new Date(n.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                    {" · bot ~30 msg / 1 mahine tak lega"}
                  </div>
                </div>
                <button onClick={() => del(n.id)} className="opacity-0 group-hover:opacity-100 text-[#9BA098] hover:text-[#A32D2D]"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            )) : <div className="text-[12.5px] text-[#9BA098] py-1">Koi bot-note nahi. Jo yahan likhoge, bot us number se baat me use karega.</div>}
          </div>
        </>
      )}
    </div>
  );
}
