import { useEffect, useState, useCallback } from "react";
import { X, ChevronRight, CheckCircle2 } from "lucide-react";
import { fetchFilingsBoard, markFiled, fetchClientLedger, type FilingBoardRow, type ClientLedger } from "../services/api";

function initials(name: string) {
  return (name || "?").trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function statusCls(status?: string) {
  if (status === "Completed") return "bg-green-50 text-green-700";
  if (!status || status === "Yet to Pick" || status === "Docs Pending") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

type Tab = "quarterly" | "monthly" | "defaulters";

export default function Filings() {
  const [tab, setTab] = useState<Tab>("quarterly");
  const [rows, setRows] = useState<FilingBoardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState<string | null>(null);

  const [sheetClient, setSheetClient] = useState<FilingBoardRow | null>(null);
  const [ledger, setLedger] = useState<ClientLedger | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await fetchFilingsBoard(tab)); } finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  async function handleMarkFiled(clientId: string) {
    setMarking(clientId);
    try { await markFiled(clientId); await load(); } finally { setMarking(null); }
  }

  async function openLedger(row: FilingBoardRow) {
    setSheetClient(row); setLedger(null); setLedgerLoading(true);
    try { setLedger(await fetchClientLedger(row.client_id)); } finally { setLedgerLoading(false); }
  }
  function closeSheet() { setSheetClient(null); setLedger(null); }

  return (
    <div className="h-full overflow-y-auto bg-[#F2F5F1] relative pb-10">
      <div className="bg-[#FBFBF9] px-5 pt-5 pb-3 sticky top-0 z-10 border-b border-[#E6E7E2]">
        <h2 className="serif text-2xl font-semibold text-[#15191E] mb-1">Filings</h2>
        <p className="text-xs text-slate-500 mb-3">Is period ka status, ek jagah</p>
        <div className="flex gap-2">
          {([["quarterly", "Quarterly"], ["monthly", "Monthly"], ["defaulters", "Defaulters"]] as [Tab, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 py-2 rounded-full text-xs font-bold border ${tab === key ? "bg-[#15191E] text-white border-[#15191E]" : "bg-white text-slate-600 border-[#E6E7E2]"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-3">
        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-9 w-9 border-b-2 border-green-600" /></div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>{tab === "defaulters" ? "Koi defaulter nahi hai" : "Is cycle me koi client nahi"}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map(r => (
              <div key={r.client_id} onClick={() => openLedger(r)}
                className="flex items-center gap-3 bg-white border border-[#E6E7E2] rounded-2xl p-3.5 cursor-pointer active:scale-[.98] active:bg-[#F2F5F1] transition">
                <div className="w-11 h-11 rounded-full bg-[#E7F2EC] text-[#0C5C40] flex items-center justify-center serif font-semibold flex-shrink-0">
                  {initials(r.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-[#15191E] truncate">{r.name}</div>
                  <div className="text-xs text-slate-500 truncate">{r.assigned_to || "—"}{tab === "defaulters" ? " · 3 quarters se file nahi hua" : ""}</div>
                </div>
                {tab !== "defaulters" && (
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${statusCls(r.status)}`}>{r.status}</span>
                )}
                {tab !== "defaulters" && r.status !== "Completed" && (
                  <button onClick={e => { e.stopPropagation(); handleMarkFiled(r.client_id); }} disabled={marking === r.client_id}
                    className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-green-700 text-white flex-shrink-0 disabled:opacity-60">
                    {marking === r.client_id ? "..." : "Filed"}
                  </button>
                )}
                <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {sheetClient && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-end sm:items-center justify-center" onClick={closeSheet}>
          <div onClick={e => e.stopPropagation()} className="bg-[#FBFBF9] w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 pb-8 sm:pb-6 max-h-[85%] overflow-y-auto">
            <div className="w-9 h-1 bg-slate-300 rounded-full mx-auto mb-4 sm:hidden" />
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-bold text-base">{sheetClient.name}</div>
                <div className="text-xs text-slate-500">{sheetClient.business_name || sheetClient.mobile}</div>
              </div>
              <button onClick={closeSheet}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            {ledgerLoading ? (
              <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-green-600" /></div>
            ) : ledger ? (
              <>
                <table className="w-full text-xs mb-3">
                  <thead><tr className="text-slate-400 text-[10px] uppercase"><th className="text-left py-1">Period</th><th className="text-right py-1">Due</th><th className="text-right py-1">Paid</th><th className="text-right py-1">Balance</th></tr></thead>
                  <tbody>
                    {ledger.rows.map(r => (
                      <tr key={r.period_key} className="border-t border-[#E6E7E2]">
                        <td className="py-1.5">{r.period_key}</td>
                        <td className="py-1.5 text-right">₹{r.due}</td>
                        <td className="py-1.5 text-right">₹{r.paid}</td>
                        <td className={`py-1.5 text-right font-semibold ${r.balance > 0 ? "text-red-600" : "text-green-700"}`}>₹{r.balance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-between items-center bg-[#F2F5F1] rounded-xl px-3 py-2.5 mb-4">
                  <span className="text-xs text-slate-500">Total balance due</span>
                  <span className={`serif font-semibold text-lg ${ledger.total_balance > 0 ? "text-red-600" : "text-green-700"}`}>
                    {ledger.total_balance > 0 ? `₹${ledger.total_balance.toLocaleString()}` : "Clear ✓"}
                  </span>
                </div>
                <button onClick={() => handleMarkFiled(sheetClient.client_id).then(closeSheet)}
                  className="w-full py-3 rounded-xl bg-green-700 text-white font-semibold text-sm">
                  Is period ko Filed mark karo
                </button>
              </>
            ) : <div className="text-sm text-slate-500 text-center py-6">Ledger load nahi hua</div>}
          </div>
        </div>
      )}
    </div>
  );
}
