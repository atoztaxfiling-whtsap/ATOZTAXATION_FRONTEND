/* ============================================================
   DocsBox — kis kaam ke liye kaunse documents chahiye
   ============================================================
   Service chunte hi list apne aap aa jaati hai (Settings → Services
   me har service ke saath list rakhi hai). Us list ko yahin badal
   sakte ho — apna document jod sakte ho, hata sakte ho.

   Jo document aa gaya usko tick karo. Bot bhi tick kar deta hai
   jab client WhatsApp pe bhejta hai aur OCR se pehchaan ho jaati
   hai — par photo dhundhli ho to pehchaan nahi hoti, isliye tick
   haath se bhi laga sakte ho.
   ============================================================ */
import { useState } from "react";
import { X, Check, Plus } from "lucide-react";
import { Modal, Btn, TextInput } from "./ui";
import type { Task, Service } from "../../services/crmLogic";

/* Har service ke default documents. Settings → Services me jo list
   likhi hai wo pehle dekhi jaati hai; wahan kuch na ho to ye. */
export const DEFAULT_DOCS: Record<string, string[]> = {
  "Income tax": ["PAN", "Form 16", "Bank statement", "Investment proofs"],
  "TDS": ["TAN", "Challan", "Deductee details"],
  "GST registration": ["Aadhaar", "PAN", "Photo", "Electricity bill", "Rent agreement / NOC", "Bank details"],
  "ITR": ["PAN", "Form 16", "Bank statement"],
  "MSME": ["PAN", "Aadhaar", "Business address proof", "Bank details"],
  "Labour License": ["PAN", "Aadhaar", "Business address proof", "Employee details"],
  "Company Registration": ["Aadhaar", "PAN", "Photo", "Electricity bill", "NOC / Rent agreement", "Bank passbook"],
  "Other": [],
};

/* Service ka naam do, documents ki list milegi.
   Pehle Settings wali list, phir DEFAULT_DOCS, phir khali. */
export function docsFor(serviceName: string, services: Service[]): string[] {
  const name = (serviceName || "").trim();
  if (!name) return [];
  const sv = services.find(s => s.name.toLowerCase() === name.toLowerCase());
  if (sv?.required_docs?.length) return [...sv.required_docs];
  const exact = DEFAULT_DOCS[name];
  if (exact) return [...exact];
  const loose = Object.keys(DEFAULT_DOCS)
    .find(k => k.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(k.toLowerCase()));
  return loose ? [...DEFAULT_DOCS[loose]] : [];
}

export default function DocsBox({ task, onClose, onSave }: {
  task: Task; onClose: () => void; onSave: (req: string[], rec: string[]) => void;
}) {
  const [req, setReq] = useState<string[]>(task.docs_required || []);
  const [rec, setRec] = useState<string[]>(task.docs_received || []);
  const [add, setAdd] = useState("");

  const has = (d: string) => rec.some(r => r.toLowerCase() === d.toLowerCase());

  function toggle(d: string) {
    setRec(has(d) ? rec.filter(r => r.toLowerCase() !== d.toLowerCase()) : [...rec, d]);
  }
  function addDoc() {
    const v = add.trim();
    if (!v || req.some(x => x.toLowerCase() === v.toLowerCase())) { setAdd(""); return; }
    setReq([...req, v]); setAdd("");
  }
  function removeDoc(d: string) {
    setReq(req.filter(x => x !== d));
    setRec(rec.filter(x => x.toLowerCase() !== d.toLowerCase()));
  }

  const done = req.filter(has).length;

  return (
    <Modal title="Documents" sub={task.name} onClose={onClose}>
      <div className="flex items-center justify-between text-[12.5px] mb-2.5">
        <span className="text-[#6B6F68]">
          {req.length ? <><b className={done === req.length ? "text-[#0F6E56]" : "text-[#A35A17]"}>{done}</b> / {req.length} mil gaye</>
                      : "Abhi koi list nahi bani"}
        </span>
        {req.length > 0 && done === req.length && (
          <span className="text-[11.5px] text-[#0F6E56] font-medium">Sab mil gaye ✓</span>
        )}
      </div>

      <div className="max-h-64 overflow-y-auto -mx-1 px-1">
        {req.map(d => (
          <div key={d} className="flex items-center gap-2.5 py-1.5 border-b border-[#E6E4DD] last:border-0">
            <button onClick={() => toggle(d)}
              className={`w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center flex-shrink-0 transition
                ${has(d) ? "bg-[#0F6E56] border-[#0F6E56]" : "bg-white border-[#C9CDC4] hover:border-[#0F6E56]"}`}>
              {has(d) && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </button>
            <span className={`text-[13px] flex-1 ${has(d) ? "text-[#9BA098] line-through" : ""}`}>{d}</span>
            <button onClick={() => removeDoc(d)} className="text-[#C9CDC4] hover:text-[#A32D2D] p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {!req.length && (
          <div className="text-[12.5px] text-[#9BA098] py-3">
            Neeche likh ke documents add karo — ya Settings → Services me is service
            ke saath list bana do, phir agli baar apne aap aa jayegi.
          </div>
        )}
      </div>

      <div className="flex gap-1.5 mt-2.5">
        <TextInput value={add} onChange={e => setAdd(e.target.value)} placeholder="Aur document jodo"
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addDoc(); } }} />
        <Btn size="sm" onClick={addDoc}><Plus className="w-3.5 h-3.5" /></Btn>
      </div>

      <div className="text-[11px] text-[#9BA098] mt-2">
        Client WhatsApp pe bheje aur OCR se pehchaan ho jaye to tick apne aap lag
        jayega. Photo dhundhli ho to pehchaan nahi hoti — tab haath se tick kar dena.
      </div>

      <div className="flex gap-2 justify-end mt-4">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={() => { onSave(req, rec); onClose(); }}>Save</Btn>
      </div>
    </Modal>
  );
}
