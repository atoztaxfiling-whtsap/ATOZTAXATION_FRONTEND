/* ============================================================
   Pending task — jo kaam abhi humare paas atka hai
   ============================================================
   Filings, Workflow tasks aur Registrations — teeno ek hi list me.
   Yahan status / employee / note badloge to seedha usi table me
   jayega, isliye Filings, Workflow, Registrations aur Payments —
   sab turant mel khayenge. Koi copy nahi banti.
   ============================================================ */
import { useMemo, useState } from "react";
import { useCrm } from "../../services/crmStore";
import { upsertFiling, updateTask, updateRegistration } from "../../services/crmApi";
import {
  buildWorkItems, workByEmployee, ageTone, money,
  BUCKET_LABEL, LATE_DAYS, WARN_DAYS, UNASSIGNED_LABEL,
  type WorkItem, type WorkBucket, type WorkKind,
} from "../../services/crmLogic";
import { Panel, PageHead, Metric, Scroller, Th, Td, EmptyRow, Avatar, inlineSelect, inlineInput } from "./ui";

const ALL = "__all__";

const KIND_TAG: Record<WorkKind, { label: string; cls: string }> = {
  filing: { label: "Filing", cls: "bg-[#E9EFF6] text-[#2C5578]" },
  task: { label: "Workflow", cls: "bg-[#FDF0E5] text-[#8A4E12]" },
  registration: { label: "Registration", cls: "bg-[#F1EAF6] text-[#5D3C77]" },
};

const TONE_TEXT = { ok: "text-[#6B6F68]", warn: "text-[#A35A17]", bad: "text-[#A32D2D]" };
const TONE_BAR = { ok: "bg-[#0F6E56]", warn: "bg-[#A35A17]", bad: "bg-[#A32D2D]" };

export default function PendingTasks() {
  const { clients, filings, tasks, registrations, staff, loading, reload, toast } = useCrm();
  const [emp, setEmp] = useState(ALL);
  const [bucket, setBucket] = useState<WorkBucket | "all">("us");
  const [kind, setKind] = useState<WorkKind | "all">("all");
  const [order, setOrder] = useState<"old" | "new" | "name">("old");
  const [busy, setBusy] = useState<string | null>(null);

  const all = useMemo(
    () => buildWorkItems(clients, filings, tasks, registrations),
    [clients, filings, tasks, registrations],
  );

  const pendingAll = useMemo(() => all.filter(i => i.bucket !== "done"), [all]);
  const ourWork = useMemo(() => all.filter(i => i.bucket === "us"), [all]);

  /* employee tabs — sirf humare paas wale kaam ki ginti,
     kyunki client ka intezaar kisi employee ki galti nahi hai */
  const emps = useMemo(() => workByEmployee(ourWork), [ourWork]);

  const rows = useMemo(() => {
    let r = all.filter(i => (bucket === "all" ? i.bucket !== "done" : i.bucket === bucket));
    if (emp !== ALL) r = r.filter(i => i.assignedTo === emp);
    if (kind !== "all") r = r.filter(i => i.kind === kind);
    if (order === "new") r = r.slice().sort((a, b) => a.days - b.days);
    else if (order === "name") r = r.slice().sort((a, b) => a.clientName.localeCompare(b.clientName));
    return r;
  }, [all, bucket, emp, kind, order]);

  const counts = {
    us: all.filter(i => i.bucket === "us").length,
    client: all.filter(i => i.bucket === "client").length,
    dept: all.filter(i => i.bucket === "dept").length,
    all: pendingAll.length,
  };
  const lateCount = ourWork.filter(i => i.days >= LATE_DAYS).length;

  /* ---- ek row ka koi bhi field badlo ---- */
  async function patch(it: WorkItem, field: "status" | "assigned_to" | "comment", value: string) {
    setBusy(it.uid);
    try {
      const v = value === UNASSIGNED_LABEL ? "" : value;
      if (it.kind === "filing") {
        const f = filings.find(x => x.id === it.id);
        if (!f) throw new Error("Filing nahi mili");
        await upsertFiling({ client_id: f.client_id, period_key: f.period_key, [field]: v } as any);
      } else if (it.kind === "task") {
        await updateTask(it.id, { [field]: v } as any);
      } else {
        await updateRegistration(it.id, { [field]: v } as any);
      }
      if (field === "status" && (value === "Completed" || value === "Payment Pending")) {
        toast(`${it.clientName} — ${value}. Fee ab Payments me due hai.`);
      }
      await reload();
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(null); }
  }

  const groups: { label: string; test: (d: number) => boolean }[] = [
    { label: `${LATE_DAYS}+ din — sabse pehle ye`, test: d => d >= LATE_DAYS },
    { label: `${WARN_DAYS}–${LATE_DAYS - 1} din — dhyan do`, test: d => d >= WARN_DAYS && d < LATE_DAYS },
    { label: `0–${WARN_DAYS - 1} din — theek chal raha hai`, test: d => d < WARN_DAYS },
  ];
  const grouped = order === "old"
    ? groups.map(g => ({ ...g, items: rows.filter(r => g.test(r.days)) })).filter(g => g.items.length)
    : [{ label: "", items: rows }];

  return (
    <div className="h-full overflow-y-auto bg-[#F6F5F1] p-5 md:p-7">
      <PageHead title="Pending task"
        sub="Jo kaam abhi humare paas atka hai — filings, workflow aur registrations, sab ek jagah" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <Metric label="Humare paas atka" value={counts.us} tone="danger" />
        <Metric label={`${LATE_DAYS}+ din se`} value={lateCount} tone="warn" />
        <Metric label="Client ka intezaar" value={counts.client} />
        <Metric label="Department ke paas" value={counts.dept} />
      </div>

      {/* employee tabs — jaise Filings me monthly/quarterly hai */}
      <div className="flex gap-0.5 border-b border-[#E6E4DD] mb-3.5 overflow-x-auto">
        <EmpTab label="Sab" total={ourWork.length} late={lateCount}
          on={emp === ALL} onClick={() => setEmp(ALL)} />
        {emps.map(e => (
          <EmpTab key={e.name}
            label={e.name === UNASSIGNED_LABEL ? "Kisi ko nahi diya" : e.name}
            total={e.total} late={e.late} on={emp === e.name} onClick={() => setEmp(e.name)} />
        ))}
        {/* jo staff hai par jiske paas abhi kuch nahi */}
        {staff.filter(s => !emps.some(e => e.name === s.name)).map(s => (
          <EmpTab key={s.id} label={s.name} total={0} late={0}
            on={emp === s.name} onClick={() => setEmp(s.name)} />
        ))}
      </div>

      <div className="flex gap-1.5 flex-wrap items-center mb-3">
        <Chip on={bucket === "us"} onClick={() => setBucket("us")} label={BUCKET_LABEL.us} n={counts.us} />
        <Chip on={bucket === "client"} onClick={() => setBucket("client")} label={BUCKET_LABEL.client} n={counts.client} />
        <Chip on={bucket === "dept"} onClick={() => setBucket("dept")} label={BUCKET_LABEL.dept} n={counts.dept} />
        <Chip on={bucket === "all"} onClick={() => setBucket("all")} label="Sab" n={counts.all} />
        <div className="flex-1" />
        <select className={inlineSelect} value={kind} onChange={e => setKind(e.target.value as any)}>
          <option value="all">Sab kaam</option>
          <option value="filing">Sirf Filings</option>
          <option value="task">Sirf Workflow</option>
          <option value="registration">Sirf Registrations</option>
        </select>
        <select className={inlineSelect} value={order} onChange={e => setOrder(e.target.value as any)}>
          <option value="old">Purana pehle</option>
          <option value="new">Naya pehle</option>
          <option value="name">Client ke naam se</option>
        </select>
      </div>

      <Panel head={<>
        <h3 className="text-[13.5px] font-semibold">
          {bucket === "all" ? "Saara pending kaam" : BUCKET_LABEL[bucket as WorkBucket]}
          <span className="text-[#9BA098] font-normal"> ({rows.length})</span>
        </h3>
        <div className="text-[11.5px] text-[#9BA098] hidden md:block">
          Status yahin badal sakte ho — Filings/Workflow me apne aap update ho jayega
        </div>
      </>}>
        {/* ---------- desktop ---------- */}
        <div className="hidden md:block">
          <Scroller>
            <thead><tr>
              <Th>Client</Th><Th>Kaam</Th><Th>Kiske paas</Th><Th>Kitne din se</Th>
              <Th>Status</Th><Th>Note</Th><Th className="text-right">Paisa</Th>
            </tr></thead>
            <tbody>
              {loading && <EmptyRow colSpan={7}>Load ho raha hai...</EmptyRow>}
              {!loading && !rows.length && <EmptyRow colSpan={7}>Yahan kuch pending nahi. 🎉</EmptyRow>}
              {grouped.map(g => (
                <>
                  {g.label && (
                    <tr key={g.label}><td colSpan={7}
                      className="bg-[#FBFAF7] text-[11px] text-[#6B6F68] font-semibold uppercase tracking-wide px-3.5 py-1.5 border-b border-[#E6E4DD]">
                      {g.label}
                    </td></tr>
                  )}
                  {g.items.map(it => {
                    const tone = ageTone(it.days);
                    const tag = KIND_TAG[it.kind];
                    return (
                      <tr key={it.uid} className={`hover:bg-[#FBFAF7] ${busy === it.uid ? "opacity-50" : ""}`}>
                        <Td>
                          <div className="flex items-center gap-2.5">
                            <Avatar name={it.clientName} />
                            <div className="min-w-0">
                              <div className="font-medium truncate">{it.clientName}</div>
                              <div className="font-mono text-[11px] text-[#9BA098]">{it.mobile || "—"}</div>
                            </div>
                          </div>
                        </Td>
                        <Td>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${tag.cls}`}>{tag.label}</span>
                          <div className="text-[12px] text-[#6B6F68] mt-1">{it.what}</div>
                        </Td>
                        <Td>
                          <select className={inlineSelect} value={it.assignedTo}
                            onChange={e => patch(it, "assigned_to", e.target.value)}>
                            <option value={UNASSIGNED_LABEL}>{UNASSIGNED_LABEL}</option>
                            {staff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                          </select>
                        </Td>
                        <Td>
                          <div className={`font-mono font-semibold text-[13px] ${TONE_TEXT[tone]}`}>
                            {it.days} din{it.approxDays ? "*" : ""}
                          </div>
                          <div className="h-[3px] rounded bg-[#EDEBE4] mt-1 w-16 overflow-hidden">
                            <div className={`h-full ${TONE_BAR[tone]}`}
                              style={{ width: `${Math.min(100, (it.days / (LATE_DAYS * 2)) * 100)}%` }} />
                          </div>
                        </Td>
                        <Td>
                          <select className={inlineSelect} value={it.status}
                            onChange={e => patch(it, "status", e.target.value)}>
                            {it.statuses.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </Td>
                        <Td>
                          <input className={inlineInput} defaultValue={it.note} placeholder="Kya chal raha hai..."
                            onBlur={e => { if (e.target.value !== it.note) patch(it, "comment", e.target.value); }} />
                        </Td>
                        <Td className="text-right">
                          {it.amount > 0 ? (
                            <>
                              <div className={`font-mono text-[12.5px] font-semibold ${it.amountNote === "due" ? "text-[#A32D2D]" : "text-[#6B6F68]"}`}>
                                {money(it.amount)}
                              </div>
                              {it.amountNote !== "due" && (
                                <div className="text-[10px] text-[#9BA098]">{it.amountNote}</div>
                              )}
                            </>
                          ) : <span className="font-mono text-[12.5px] text-[#0F6E56]">Clear</span>}
                        </Td>
                      </tr>
                    );
                  })}
                </>
              ))}
            </tbody>
          </Scroller>
        </div>

        {/* ---------- mobile ---------- */}
        <div className="md:hidden">
          {loading && <div className="px-4 py-5 text-[12.5px] text-[#9BA098]">Load ho raha hai...</div>}
          {!loading && !rows.length && <div className="px-4 py-5 text-[12.5px] text-[#9BA098]">Yahan kuch pending nahi. 🎉</div>}
          {rows.map(it => {
            const tone = ageTone(it.days);
            const tag = KIND_TAG[it.kind];
            return (
              <div key={it.uid} className={`px-4 py-3 border-b border-[#E6E4DD] last:border-0 ${busy === it.uid ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="font-medium text-[13.5px] truncate">{it.clientName}</div>
                    <div className="text-[11.5px] text-[#6B6F68] mt-0.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${tag.cls}`}>{tag.label}</span>
                      <span className="ml-1.5">{it.what}</span>
                    </div>
                  </div>
                  <div className={`font-mono text-[12.5px] font-semibold whitespace-nowrap ${TONE_TEXT[tone]}`}>
                    {it.days} din{it.approxDays ? "*" : ""}
                  </div>
                </div>
                <div className="flex gap-1.5 items-center flex-wrap">
                  <select className={inlineSelect} value={it.status}
                    onChange={e => patch(it, "status", e.target.value)}>
                    {it.statuses.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <select className={inlineSelect} value={it.assignedTo}
                    onChange={e => patch(it, "assigned_to", e.target.value)}>
                    <option value={UNASSIGNED_LABEL}>{UNASSIGNED_LABEL}</option>
                    {staff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                  {it.amount > 0 && (
                    <span className={`font-mono text-[12px] font-semibold ml-auto ${it.amountNote === "due" ? "text-[#A32D2D]" : "text-[#9BA098]"}`}>
                      {money(it.amount)}
                    </span>
                  )}
                </div>
                <input className={`${inlineInput} mt-1.5`} defaultValue={it.note} placeholder="Note — kya chal raha hai..."
                  onBlur={e => { if (e.target.value !== it.note) patch(it, "comment", e.target.value); }} />
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="flex gap-4 flex-wrap text-[11px] text-[#9BA098] mt-2.5">
        <span><i className="inline-block w-2 h-2 rounded-sm bg-[#0F6E56] mr-1.5" />0–{WARN_DAYS - 1} din theek</span>
        <span><i className="inline-block w-2 h-2 rounded-sm bg-[#A35A17] mr-1.5" />{WARN_DAYS}–{LATE_DAYS - 1} din dhyan do</span>
        <span><i className="inline-block w-2 h-2 rounded-sm bg-[#A32D2D] mr-1.5" />{LATE_DAYS}+ din late</span>
        {rows.some(r => r.approxDays) && <span>* purana record — din ka hisaab approximate hai</span>}
      </div>

      <div className="flex items-start gap-2 text-[12px] text-[#7A4A12] bg-[#FFF6E8] border border-[#F2DFBE] rounded-lg px-3.5 py-2.5 mt-3.5">
        <div>
          <b>"Client ke paas"</b> me wo kaam jaate hain jinme status <i>Yet to Pick, Documents
          Pending, Query Raised, Waiting for Reply, Not Responding</i> hai — matlab galti humari
          nahi, client se jawab nahi aaya. <b>"Department ke paas"</b> me registration ke wo kaam
          jinka status <i>Department Approval</i> hai — wahan sirf intezaar hai.
        </div>
      </div>

      <div className="h-8" />
    </div>
  );
}

function EmpTab({ label, total, late, on, onClick }:
  { label: string; total: number; late: number; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`px-3.5 pt-2 pb-2.5 text-[13px] whitespace-nowrap flex gap-1.5 items-center border-b-2 transition
        ${on ? "text-[#1C1E1B] font-semibold border-[#0F6E56]" : "text-[#6B6F68] border-transparent hover:text-[#1C1E1B]"}`}>
      {label}
      <span className={`text-[10.5px] rounded-full px-1.5 py-px font-semibold
        ${on ? "bg-[#E7F2EC] text-[#0F6E56]" : "bg-[#EDEBE4] text-[#6B6F68]"}`}>{total}</span>
      {late > 0 && (
        <span className="text-[10.5px] rounded-full px-1.5 py-px font-semibold bg-[#FBEDED] text-[#A32D2D]">
          {late} late
        </span>
      )}
    </button>
  );
}

function Chip({ label, n, on, onClick }: { label: string; n: number; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`text-[12px] px-2.5 py-1.5 rounded-full border transition
        ${on ? "bg-[#1C1E1B] text-white border-[#1C1E1B] font-medium"
             : "bg-white text-[#6B6F68] border-[#E6E4DD] hover:bg-[#FBFAF7]"}`}>
      {label} <span className="opacity-65">{n}</span>
    </button>
  );
}
