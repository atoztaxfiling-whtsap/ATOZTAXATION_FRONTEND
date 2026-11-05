/* Performance — har staff ka average handling time per service.
   - Time = 'Documents Received' se 'Completed' tak, sirf OFFICE HOURS (Mon–Sat 10–7).
   - Har mahine fresh (is mahine ka running avg + pichle mahine ka avg).
   - Target se kam = hara, zyada = laal. Jis service ka target nahi, sirf avg dikhega.
   - Staff ko sirf apna dikhta; owner ko sabka. (Appraisal factor — incentive ki jagah.) */
import { useEffect, useMemo, useState } from "react";
import { useCrm } from "../../services/crmStore";
import { fetchBotSettings, fetchPerfMoney, type MoneyBucket, type MoneyStaff } from "../../services/crmApi";
import { perfItems, monthKey, fmtHours, type PerfItem } from "../../services/crmLogic";
import { Panel, PageHead } from "./ui";

/* +₹150 / −₹50 jaisa dikhao */
const rs = (n: number) => `${n < 0 ? "−" : n > 0 ? "+" : ""}₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;
const tone = (n: number) => (n < 0 ? "text-[#A32D2D]" : n > 0 ? "text-[#0E7A52]" : "text-[#9BA098]");

function MoneyBox({ label, b }: { label: string; b?: MoneyBucket }) {
  return (
    <div className="flex-1 min-w-[150px] rounded-lg border border-[#E4E8E6] bg-white px-3 py-2">
      <div className="text-[10.5px] uppercase tracking-wide text-[#9BA098]">{label}</div>
      {b && b.count ? (
        <>
          <div className={`text-[17px] font-semibold ${tone(b.net)}`}>{rs(b.net)}</div>
          <div className="text-[11px] text-[#6B6F68]">
            Bonus <span className="text-[#0E7A52] font-medium">{rs(b.bonus)}</span> · Cut <span className="text-[#A32D2D] font-medium">{rs(b.cut)}</span>
            <span className="text-[#C2C8C4]"> · {b.count} kaam{b.late ? `, ${b.late} late` : ""}</span>
          </div>
        </>
      ) : <div className="text-[12px] text-[#C2C8C4] mt-1">Koi scored kaam nahi</div>}
    </div>
  );
}

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
  const [money, setMoney] = useState<MoneyStaff[]>([]);
  const curKey = monthKey(new Date().toISOString());
  const prevKey = lastMonthKey();

  useEffect(() => { fetchBotSettings().then(s => setTargets(s.sla_targets || {})).catch(() => {}); }, []);
  useEffect(() => { fetchPerfMoney().then(m => setMoney(m.staff || [])).catch(() => {}); }, []);
  const moneyBy = useMemo(() => {
    const m: Record<string, MoneyStaff> = {};
    money.forEach(x => { m[x.staff.trim().toLowerCase()] = x; });
    return m;
  }, [money]);

  const perf = useMemo<StaffPerf[]>(() => {
    const all = perfItems(filings, tasks, registrations);
    // owner => sabke naam; staff => sirf apna
    const names = me.owner
      ? Array.from(new Set([...staff.map(s => s.name), ...all.map(a => a.staff), ...money.map(x => x.staff)])).filter(n => n && n !== "—")
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
    }).filter(sp => sp.rows.length || moneyBy[sp.staff.trim().toLowerCase()]);
  }, [filings, tasks, registrations, staff, me, targets, curKey, prevKey, money, moneyBy]);

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
        {perf.map(sp => {
          const mo = moneyBy[sp.staff.trim().toLowerCase()];
          return (
          <Panel key={sp.staff} head={<h3 className="text-[13.5px] font-semibold">{sp.staff}</h3>}>
            {/* Payment: time ke andar = bonus, late = cut (Settings → incentive wale slab se) */}
            <div className="px-4 pt-3 pb-1">
              <div className="text-[11px] uppercase tracking-wide text-[#9BA098] mb-1.5">Payment (bonus / cut)</div>
              <div className="flex gap-2 flex-wrap">
                <MoneyBox label={`Is mahine · ${monthName(curKey)}`} b={mo?.cur} />
                <MoneyBox label={`Pichla mahina · ${monthName(prevKey)}`} b={mo?.prev} />
              </div>
              {mo && mo.services.length > 0 && (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="text-left text-[#9BA098] text-[10.5px] uppercase tracking-wide">
                        <th className="py-1.5 pr-3 font-medium">Service</th>
                        <th className="py-1.5 pr-3 font-medium">Is mahine</th>
                        <th className="py-1.5 pr-3 font-medium">Pichla mahina</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mo.services.map(s => (
                        <tr key={s.service} className="border-t border-[#EEF1EF]">
                          <td className="py-1.5 pr-3 capitalize font-medium">{s.service}</td>
                          <td className="py-1.5 pr-3">{s.cur.count
                            ? <><span className={`font-semibold ${tone(s.cur.net)}`}>{rs(s.cur.net)}</span> <span className="text-[#C2C8C4]">· {s.cur.count}{s.cur.late ? ` (${s.cur.late} late)` : ""}</span></>
                            : <span className="text-[#C2C8C4]">—</span>}</td>
                          <td className="py-1.5 pr-3">{s.prev.count
                            ? <><span className={`font-semibold ${tone(s.prev.net)}`}>{rs(s.prev.net)}</span> <span className="text-[#C2C8C4]">· {s.prev.count}{s.prev.late ? ` (${s.prev.late} late)` : ""}</span></>
                            : <span className="text-[#C2C8C4]">—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            {sp.rows.length > 0 && <div className="px-4 pt-2 text-[11px] uppercase tracking-wide text-[#9BA098]">Handling time</div>}
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
          );
        })}
      </div>
      <div className="h-8" />
    </div>
  );
}
