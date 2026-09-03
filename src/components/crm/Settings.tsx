/* Staff + Services — dono ek hi screen pe, tabs me */
import { useState, useEffect } from "react";
import { fetchBotSettings, saveBotSettings, fetchIncentive, type SlabTier, type IncentiveRow } from "../../services/crmApi";
import { Plus, Trash2, Download, RefreshCw } from "lucide-react";
import { useCrm } from "../../services/crmStore";
import {
  createStaff, updateStaff, deleteStaff, restoreStaff,
  createService, updateService, deleteService, restoreService,
  runBackup, backupBase, type BackupInfo,
  runSheetSync, importFromSheets, type SyncStats,
} from "../../services/crmApi";
import { money, type Staff, type Service } from "../../services/crmLogic";
import { DocsEditor } from "./Workflow";
import { docsFor } from "./DocsBox";
import { Avatar, Panel, PageHead, Btn, Modal, Field, Row2, TextInput, SelectInput } from "./ui";

export default function Settings() {
  const [tab, setTab] = useState<"staff" | "services" | "backup" | "sheet" | "prompts" | "incentive">("staff");
  return (
    <div className="h-full overflow-y-auto bg-[#F6F5F1] p-5 md:p-7">
      <PageHead title="Setup" sub="Team, services aur backup" />
      <div className="flex gap-1.5 mb-4">
        {(["staff", "services", "backup", "sheet", "prompts", "incentive"] as const).map(k => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-medium border capitalize ${tab === k ? "bg-[#1C1E1B] text-white border-[#1C1E1B]" : "bg-white text-[#6B6F68] border-[#E6E4DD]"}`}>{k}</button>
        ))}
      </div>
      {tab === "staff" ? <StaffList /> : tab === "services" ? <ServiceList /> : tab === "backup" ? <BackupPanel /> : tab === "prompts" ? <PromptsPanel /> : tab === "incentive" ? <div className="space-y-4"><EarningsSummary /><IncentivePanel /></div> : <SheetPanel />}
      <div className="h-8" />
    </div>
  );
}

function PromptsPanel() {
  const [text, setText] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    fetchBotSettings().then(v => setText(v.instructions || "")).catch(e => setMsg((e as Error).message));
  }, []);
  async function save() {
    if (text === null) return;
    setSaving(true); setMsg("");
    try { await saveBotSettings({ instructions: text }); setMsg("Save ho gaya. Bot ~30 sec me naye instructions follow karega."); }
    catch (e) { setMsg((e as Error).message); }
    finally { setSaving(false); }
  }
  return (
    <Panel head={<h3 className="text-[13.5px] font-semibold">Bot instructions</h3>}>
      <div className="p-4">
        <p className="text-[12.5px] text-[#6B6F68] mb-2">
          Yahan bot ke liye khaas hidayat likho — fee rules, kaunsi baat kaise bole, kya na bole.
          Bot har jawab me inhe sabse upar rakh ke follow karega. Save ke ~30 sec baad live.
        </p>
        {text === null ? <div className="text-[12.5px] text-[#9BA098]">Load ho raha hai...</div> : (
          <>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={16}
              className="w-full border border-[#E6E4DD] rounded-lg p-3 text-[13px] font-mono outline-none focus:border-[#0F6E56] bg-white"
              placeholder="Bot ke liye instructions likho..." />
            <div className="flex items-center gap-3 mt-3">
              <Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Btn>
              {msg && <span className="text-[12px] text-[#6B6F68]">{msg}</span>}
            </div>
          </>
        )}
      </div>
    </Panel>
  );
}

function EarningsSummary() {
  const [totals, setTotals] = useState<{ staff: string; amount: number }[] | null>(null);
  const [recent, setRecent] = useState<IncentiveRow[]>([]);
  const [err, setErr] = useState("");
  useEffect(() => {
    fetchIncentive()
      .then(d => { setTotals(d.totals || []); setRecent(d.recent || []); })
      .catch(e => setErr((e as Error).message));
  }, []);
  const monthName = new Date().toLocaleDateString("en-IN", { month: "long" });
  return (
    <Panel head={<h3 className="text-[13.5px] font-semibold">Kaun kitna kamaya — {monthName}</h3>}>
      <div className="p-4">
        {err && <div className="text-[12px] text-[#B00020] mb-2">{err}</div>}
        {totals === null ? (
          <div className="text-[12.5px] text-[#9BA098]">Load ho raha hai...</div>
        ) : totals.length === 0 ? (
          <div className="text-[12.5px] text-[#9BA098]">Is mahine abhi koi incentive record nahi.</div>
        ) : (
          <div className="flex flex-wrap gap-2 mb-3">
            {totals.map(t => (
              <div key={t.staff} className="px-3 py-2 rounded-lg border border-[#E6E4DD] bg-white">
                <div className="text-[12px] text-[#6B6F68]">{t.staff}</div>
                <div className={`text-[15px] font-semibold ${t.amount >= 0 ? "text-[#0F6E56]" : "text-[#B00020]"}`}>
                  {t.amount >= 0 ? "+" : ""}₹{t.amount}
                </div>
              </div>
            ))}
          </div>
        )}
        {recent.length > 0 && (
          <div className="mt-1">
            <div className="text-[11.5px] uppercase tracking-wide text-[#9BA098] mb-1.5">Recent</div>
            <div className="space-y-1">
              {recent.slice(0, 12).map((r, i) => (
                <div key={i} className="flex items-center justify-between text-[12.5px] border-b border-[#F0EEE8] pb-1">
                  <span className="text-[#3A3D37]">
                    {r.staff} · <span className="text-[#6B6F68]">{r.category || r.service_key}</span>
                    {r.worked_hours != null && <span className="text-[#9BA098]"> · {r.worked_hours}h</span>}
                    {r.tier && <span className="text-[#9BA098]"> · {r.tier}</span>}
                  </span>
                  <span className={`font-medium ${r.amount >= 0 ? "text-[#0F6E56]" : "text-[#B00020]"}`}>
                    {r.amount >= 0 ? "+" : ""}₹{r.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

function IncentivePanel() {
  type Row = { name: string; tiers: SlabTier[] };
  const [rows, setRows] = useState<Row[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    fetchBotSettings()
      .then(v => setRows(Object.entries(v.incentive_slabs || {}).map(([name, tiers]) => ({ name, tiers: (tiers as SlabTier[]).map(t => [...t] as SlabTier) }))))
      .catch(e => setMsg((e as Error).message));
  }, []);
  function upd(fn: (c: Row[]) => void) {
    setRows(r => { if (!r) return r; const c = r.map(x => ({ name: x.name, tiers: x.tiers.map(t => [...t] as SlabTier) })); fn(c); return c; });
  }
  async function save() {
    if (!rows) return;
    const obj: Record<string, SlabTier[]> = {};
    for (const r of rows) if (r.name.trim()) obj[r.name.trim()] = r.tiers;
    setSaving(true); setMsg("");
    try { await saveBotSettings({ incentive_slabs: obj }); setMsg("Save ho gaya. ~30 sec me live."); }
    catch (e) { setMsg((e as Error).message); }
    finally { setSaving(false); }
  }
  if (rows === null)
    return <Panel head={<h3 className="text-[13.5px] font-semibold">Incentive slabs</h3>}><div className="p-4 text-[12.5px] text-[#9BA098]">Load ho raha hai...</div></Panel>;
  return (
    <Panel head={<h3 className="text-[13.5px] font-semibold">Incentive slabs — speed bonus/penalty</h3>}>
      <div className="p-4 space-y-4">
        <p className="text-[12.5px] text-[#6B6F68]">
          Har service pe: kaam kitne <b>working ghante</b> me hua us hisaab se staff ko ₹ bonus/penalty.
          "≤ X h" = utne ghante ke andar; "After" = us se late (penalty ke liye minus me likho, jaise -15).
          Raat 9pm–10am, Sunday, aur client-ka-intezaar (OTP/Clarification/Docs Pending) count nahi hota.
        </p>
        {rows.map((r, ri) => (
          <div key={ri} className="border border-[#E6E4DD] rounded-lg p-3 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <input value={r.name} onChange={e => upd(c => { c[ri].name = e.target.value; })}
                className="flex-1 border border-[#E6E4DD] rounded px-2 py-1 text-[13px] font-medium outline-none focus:border-[#0F6E56]" placeholder="Service naam" />
              <button onClick={() => upd(c => { c.splice(ri, 1); })} className="text-[#B00020] p-1"><Trash2 size={15} /></button>
            </div>
            <div className="space-y-1.5">
              {r.tiers.map((t, ti) => (
                <div key={ti} className="flex items-center gap-2 text-[12.5px]">
                  {t[0] === null ? (
                    <span className="w-[70px] text-[#6B6F68]">After</span>
                  ) : (
                    <span className="flex items-center gap-1">≤
                      <input type="number" value={t[0] ?? 0} onChange={e => upd(c => { c[ri].tiers[ti][0] = e.target.value === "" ? 0 : Number(e.target.value); })}
                        className="w-14 border border-[#E6E4DD] rounded px-1.5 py-1 outline-none focus:border-[#0F6E56]" /> h
                    </span>
                  )}
                  <span>→ ₹</span>
                  <input type="number" value={t[1]} onChange={e => upd(c => { c[ri].tiers[ti][1] = e.target.value === "" ? 0 : Number(e.target.value); })}
                    className="w-20 border border-[#E6E4DD] rounded px-1.5 py-1 outline-none focus:border-[#0F6E56]" />
                  <button onClick={() => upd(c => { c[ri].tiers.splice(ti, 1); })} className="text-[#9BA098] hover:text-[#B00020] p-0.5"><Trash2 size={13} /></button>
                </div>
              ))}
              <div className="flex gap-3 pt-1">
                <button onClick={() => upd(c => { c[ri].tiers.push([1, 0]); })} className="text-[12px] text-[#0F6E56] flex items-center gap-1"><Plus size={12} /> tier</button>
                <button onClick={() => upd(c => { c[ri].tiers.push([null, 0]); })} className="text-[12px] text-[#6B6F68] flex items-center gap-1"><Plus size={12} /> "After" tier</button>
              </div>
            </div>
          </div>
        ))}
        <button onClick={() => upd(c => { c.push({ name: "New Service", tiers: [[2, 0], [null, 0]] }); })}
          className="text-[12.5px] text-[#0F6E56] flex items-center gap-1"><Plus size={14} /> Service add</button>
        <div className="flex items-center gap-3 pt-1">
          <Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Btn>
          {msg && <span className="text-[12px] text-[#6B6F68]">{msg}</span>}
        </div>
      </div>
    </Panel>
  );
}

function SheetPanel() {
  const { reload } = useCrm();
  const [busy, setBusy] = useState<"" | "sync" | "import">("");
  const [res, setRes] = useState<SyncStats | null>(null);
  const [err, setErr] = useState("");

  async function go(kind: "sync" | "import") {
    if (kind === "import" && !confirm("Sheet ka poora purana data CRM me le aayein? Thoda time lag sakta hai.")) return;
    setBusy(kind); setErr(""); setRes(null);
    try { setRes(kind === "sync" ? await runSheetSync() : await importFromSheets()); await reload(); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(""); }
  }

  const L: Record<string, string> = {
    clients_added: "Naye client bane", clients_filled: "Client ki khali jagah bhari",
    cycle_set: "Monthly/quarterly set hua", tasks_added: "Naye workflow task",
    tasks_updated: "Workflow task update hue",
  };

  return (
    <>
      <div className="text-[12.5px] text-[#6B6F68] mb-3 leading-relaxed">
        Sheet aur CRM apne aap barabar rehte hain — <b>har 10 minute</b> me sheet padhi jaati hai.
        CRM me kuch karo to sheet me turant chala jaata hai. Yahan se turant bhi chala sakte ho.
      </div>
      <div className="flex gap-2 flex-wrap">
        <Btn variant="primary" onClick={() => go("sync")} disabled={!!busy}>
          <RefreshCw className="w-3.5 h-3.5" />{busy === "sync" ? "Chal raha hai..." : "Abhi sync karo"}
        </Btn>
        <Btn onClick={() => go("import")} disabled={!!busy}>
          {busy === "import" ? "Aa raha hai..." : "Purana data sheet se le aao"}
        </Btn>
      </div>
      {err && <div className="bg-[#FCEBEB] text-[#501313] text-[12.5px] rounded-lg px-3 py-2 mt-3">{err}</div>}
      {res && (
        <div className="mt-4">
          <Panel head={<h3 className="text-[13.5px] font-semibold">Ho gaya</h3>}>
            <div className="px-4 py-3 text-[12.5px]">
              {res.skipped && <div className="text-[#9BA098]">Chhoda: {res.skipped}</div>}
              {res.error && <div className="text-[#A32D2D]">{res.error}</div>}
              {Object.entries(res).filter(([k]) => L[k]).map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-[#E6E4DD] py-1 last:border-0">
                  <span className="text-[#6B6F68]">{L[k]}</span><span className="font-mono font-semibold">{String(v)}</span>
                </div>
              ))}
              {!Object.entries(res).some(([k, v]) => L[k] && Number(v) > 0) && !res.error &&
                <div className="text-[#9BA098]">Kuch naya nahi mila — sab pehle se barabar hai.</div>}
            </div>
          </Panel>
        </div>
      )}
      <div className="text-[11.5px] text-[#9BA098] mt-3 leading-relaxed">
        Sheet se aane wala data tumhara bhara hua kabhi nahi mitayega — sirf khali jagah bharega.
        Rates aur per-period filing history sirf CRM me rehti hai, wo sheet me hai hi nahi.
      </div>
    </>
  );
}

function BackupPanel() {
  const [info, setInfo] = useState<BackupInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function run() {
    setBusy(true); setErr("");
    try { setInfo(await runBackup()); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  const kb = (n: number) => `${Math.round(n / 1024)} KB`;

  return (
    <>
      <div className="text-[12.5px] text-[#6B6F68] mb-3 leading-relaxed">
        Har mahine ki <b>1 tareekh subah 7 baje</b> backup apne aap ban jaata hai aur
        tumhare WhatsApp pe download link aa jaati hai. Yahan se kabhi bhi turant bhi le sakte ho.
      </div>
      <Btn variant="primary" onClick={run} disabled={busy}>
        <Download className="w-3.5 h-3.5" />{busy ? "Ban raha hai..." : "Backup abhi lo"}
      </Btn>

      {err && <div className="bg-[#FCEBEB] text-[#501313] text-[12.5px] rounded-lg px-3 py-2 mt-3">{err}</div>}

      {info && (
        <div className="mt-4">
          <Panel head={<h3 className="text-[13.5px] font-semibold">{info.name} · {info.generated_at}</h3>}>
            <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[12.5px]">
              {Object.entries(info.counts).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2 border-b border-[#E6E4DD] pb-1">
                  <span className="text-[#6B6F68] capitalize">{k.replace("_", " ")}</span>
                  <span className="font-mono font-semibold">{v}</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 flex flex-col sm:flex-row gap-2 border-t border-[#E6E4DD]">
              <a href={backupBase() + info.xlsx_url} target="_blank" rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1C1E1B] text-white text-[13px] font-medium">
                <Download className="w-3.5 h-3.5" />Excel ({kb(info.xlsx_size)})
              </a>
              <a href={backupBase() + info.json_url} target="_blank" rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-[#E6E4DD] text-[13px] font-medium">
                <Download className="w-3.5 h-3.5" />Full data / restore file ({kb(info.json_size)})
              </a>
            </div>
            <div className="px-4 pb-3 text-[11.5px] text-[#9BA098] leading-relaxed">
              Excel padhne ke liye hai — usme passwords nahi hote, isliye wo WhatsApp pe bhejna safe hai.
              Doosri file me sab kuch hota hai (passwords bhi) — usse database kabhi kharab ho to
              poora data wapas laya ja sakta hai. Dono link 7 din chalte hain.
            </div>
          </Panel>
        </div>
      )}
    </>
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
      <div className="text-[12.5px] text-[#6B6F68] mb-3">
        Ye list non-GST services ke liye hai. GST filing ka rate har client ke apne 4 rates se aata hai.
        Har service ke saath documents ki list bhi rakh sakte ho — Workflow me wo service
        chunte hi list apne aap aa jayegi.
      </div>
      <Panel>
        {!services.length && <div className="px-4 py-5 text-[12.5px] text-[#9BA098]">Koi service nahi.</div>}
        {services.map(s => (
          <div key={s.id} onClick={() => setEdit(s)} className="flex items-center gap-3 px-4 py-3 border-b border-[#E6E4DD] last:border-0 cursor-pointer hover:bg-[#FBFAF7]">
            <div className="flex-1 min-w-0"><div className="font-medium text-[13.5px]">{s.name}</div>
              <div className="text-[11.5px] text-[#6B6F68]">
                {s.default_fee ? money(Number(s.default_fee)) : "—"}{s.min_fee ? ` (min ${money(Number(s.min_fee))})` : ""}
                {s.required_docs?.length
                  ? <span className="text-[#0F6E56]"> · {s.required_docs.length} document</span>
                  : <span className="text-[#A35A17]"> · documents ki list nahi bani</span>}
              </div></div>
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
  const [docs, setDocs] = useState<string[]>(item?.required_docs || []);
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  async function save() {
    if (!f.name.trim()) return;
    setSaving(true);
    const payload = { name: f.name.trim(), default_fee: f.default_fee ? Number(f.default_fee) : undefined, min_fee: f.min_fee ? Number(f.min_fee) : undefined, note: f.note || undefined, required_docs: docs };
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
      <Field label="Is service ke liye kaunse documents chahiye"
        hint="Workflow me ye service chunte hi ye list apne aap aa jayegi">
        <DocsEditor list={docs} onChange={setDocs} />
        {!docs.length && !!f.name.trim() && docsFor(f.name, []).length > 0 && (
          <button onClick={() => setDocs(docsFor(f.name, []))}
            className="text-[11.5px] text-[#0F6E56] font-medium mt-1.5 hover:underline">
            + Ready list bhar do ({docsFor(f.name, []).length} document)
          </button>
        )}
      </Field>
      <div className="flex gap-2 justify-end mt-4">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Btn>
      </div>
    </Modal>
  );
}
