/* Performance — har staff ka average handling time per service.
   - Time = 'Documents Received' se 'Completed' tak, sirf OFFICE HOURS (Mon–Sat 10–7).
   - Har mahine fresh (is mahine ka running avg + pichle mahine ka avg).
   - Target se kam = hara, zyada = laal. Jis service ka target nahi, sirf avg dikhega.
   - Staff ko sirf apna dikhta; owner ko sabka. (Appraisal factor — incentive ki jagah.) */
import { useEffect, useMemo, useState } from "react";
import { useCrm } from "../../services/crmStore";
import { fetchBotSettings } from "../../services/crmApi";
import { perfItems, monthKey, fmtHours, type PerfItem } from "../../services/crmLogic";
import { Panel, PageHead } from "./ui";

function lastMonthKey(): string {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthName(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-IN", { month: "short", year: "numeric" });
}

interface Cell { avg: number; count: number; }
interface StaffPerf { staff: string; rows: Array<{ service: string; target?: number; cur?: Cell; prev?: Cell }>; }

function avgOf(items: PerfItem[]): Cell | undefined {
  if (!items.length) return undefined;
  const sum = items.reduce((a, x) => a + x.hours, 0);
  return { avg: sum / items.length, count: items.length };
}

export default function Performance() {
  const { filings, tasks, registrations, staff, me } = useCrm();
  const [targets, setTargets] = useState<Record<string, number>>({});
  const curKey = monthKey(new Date().toISOString());
  const prevKey = lastMonthKey();

  useEffect(() => { fetchBotSettings().then(s => setTargets(s.sla_targets || {})).catch(() => {}); }, []);

  const perf = useMemo<StaffPerf[]>(() => {
    const all = perfItems(filings, tasks, registrations);
    // owner => sabke naam; staff => sirf apna
    const names = me.owner
      ? Array.from(new Set([...staff.map(s => s.name), ...all.map(a => a.staff)])).filter(n => n && n !== "—")
      : [me.name].filter(Boolean);
    const targetServices = Object.keys(targets);
    return names.map(name => {
      const mine = all.filter(a => a.staff === name);
      const services = Array.from(new Set([...targetServices, ...mine.map(m => m.service)]));
      const rows = services.map(service => {
        const svcItems = mine.filter(m => m.service === service);
        return {
          service,
          target: targets[service],
          cur: avgOf(svcItems.filter(m => monthKey(m.completedAt) === curKey)),
          prev: avgOf(svcItems.filter(m => monthKey(m.completedAt) === prevKey)),
        };
      }).filter(r => r.target != null || r.cur || r.prev);  // khali service mat dikhao
      // target wali upar, phir naam se
      rows.sort((a, b) => (a.target != null === (b.target != null) ? a.service.localeCompare(b.service) : a.target != null ? -1 : 1));
      return { staff: name, rows };
    }).filter(sp => sp.rows.length);
  }, [filings, tasks, registrations, staff, me, targets, curKey, prevKey]);

  return (
    <div className="h-full overflow-y-auto bg-[#F5F7F6] p-4 md:p-6">
      <PageHead title="Performance" sub={`Handling time (office hours) · ${monthName(curKey)} chal raha · har mahine fresh`} />

      <div className="mb-4 text-[11.5px] text-[#6B6F68] bg-[#EEF4F1] border border-[#DCEAE3] rounded-lg px-3 py-2">
        Time 'Documents Received' se 'Completed' tak ginta hai — sirf office hours (Mon–Sat, 10am–7pm). Raat/Sunday nahi.
        {!me.owner && " Ye sirf aapka record hai."}
      </div>

      {!perf.length && (
        <Panel><div className="px-4 py-6 text-[12.5px] text-[#9BA098]">
          Abhi koi completed kaam nahi (jisme docs-received se complete tak ka time ho). Jaise-jaise naye kaam complete honge, yahan average aata jayega.
        </div></Panel>
      )}

      <div className="space-y-4">
        {perf.map(sp => (
          <Panel key={sp.staff} head={<h3 className="text-[13.5px] font-semibold">{sp.staff}</h3>}>
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="text-left text-[#9BA098] text-[11px] uppercase tracking-wide">
                    <th className="px-4 py-2 font-medium">Service</th>
                    <th className="px-3 py-2 font-medium">Target</th>
                    <th className="px-3 py-2 font-medium">Is mahine (avg)</th>
                    <th className="px-3 py-2 font-medium">Pichla mahina</th>
                  </tr>
                </thead>
                <tbody>
                  {sp.rows.map(r => {
                    const over = r.target != null && r.cur && r.cur.avg > r.target;
                    const under = r.target != null && r.cur && r.cur.avg <= r.target;
                    return (
                      <tr key={r.service} className="border-t border-[#EEF1EF]">
                        <td className="px-4 py-2.5 font-medium">{r.service}</td>
                        <td className="px-3 py-2.5 text-[#6B6F68]">{r.target != null ? `${r.target} hr` : "—"}</td>
                        <td className="px-3 py-2.5">
                          {r.cur
                            ? <span className={`font-semibold ${over ? "text-[#A32D2D]" : under ? "text-[#0E7A52]" : ""}`}>
                                {fmtHours(r.cur.avg)} <span className="text-[#9BA098] font-normal">· {r.cur.count}</span>
                              </span>
                            : <span className="text-[#C2C8C4]">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-[#6B6F68]">
                          {r.prev ? <>{fmtHours(r.prev.avg)} <span className="text-[#C2C8C4]">· {r.prev.count}</span></> : <span className="text-[#C2C8C4]">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        ))}
      </div>
      <div className="h-8" />
    </div>
  );
}
