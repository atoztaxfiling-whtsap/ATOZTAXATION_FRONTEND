import { useEffect, useState, useCallback } from "react";
import { X, ChevronRight, IndianRupee } from "lucide-react";
import {
  fetchPaymentsSummary, fetchPaymentsBoard, fetchClientLedger, createPayment, deletePayment, restorePayment,
  type PaymentsSummary, type PaymentBoardRow, type ClientLedger,
} from "../services/api";

function initials(name: string) {
  return (name || "?").trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function Payments() {
  const [summary, setSummary] = useState<PaymentsSummary>({ collected: 0, pending: 0, clients_with_balance: 0 });
  const [rows, setRows] = useState<PaymentBoardRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [sheetClient, setSheetClient] = useState<PaymentBoardRow | null>(null);
  const [ledger, setLedger] = useState<ClientLedger | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("UPI");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; undoId?: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([fetchPaymentsSummary(), fetchPaymentsBoard()]);
      setSummary(s); setRows(r);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); }, [toast]);

  async function openClient(row: PaymentBoardRow) {
    setSheetClient(row); setLedger(null); setAmount(""); setLedgerLoading(true);
    try { setLedger(await fetchClientLedger(row.client_id)); } finally { setLedgerLoading(false); }
  }
  function closeSheet() { setSheetClient(null); setLedger(null); }

  async function recordPayment() {
    const amt = parseFloat(amount);
    if (!sheetClient || !amt || amt <= 0) return;
    setSaving(true);
    try {
      await createPayment({ client_id: sheetClient.client_id, amount: amt, method });
      setAmount("");
      setLedger(await fetchClientLedger(sheetClient.client_id));
      await load();
      setToast({ msg: `₹${amt.toLocaleString()} record ho gaya` });
    } catch (e) { alert("Save nahi hua: " + (e as Error).message); }
    finally { setSaving(false); }
  }

  async function removePayment(id: string) {
    if (!confirm("Ye payment entry delete karni hai?")) return;
    try {
      await deletePayment(id);
      if (sheetClient) setLedger(await fetchClientLedger(sheetClient.client_id));
      await load();
      setToast({ msg: "Payment hataya gaya", undoId: id });
    } catch (e) { alert("Delete nahi hua: " + (e as Error).message); }
  }

  async function undo(id: string) {
    try { await restorePayment(id); setToast(null); if (sheetClient) setLedger(await fetchClientLedger(sheetClient.client_id)); await load(); }
    catch (e) { alert("Undo nahi hua: " + (e as Error).message); }
  }

  return (
    <div className="h-full overflow-y-auto bg-[#F2F5F1] relative pb-10">
      <div className="bg-[#FBFBF9] px-5 pt-5 pb-4 sticky top-0 z-10 border-b border-[#E6E7E2]">
        <h2 className="serif text-2xl font-semibold text-[#15191E] mb-3">Payments</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-[#E6E7E2] rounded-2xl p-3.5">
            <div className="text-[11px] text-slate-500 mb-1">Collected</div>
            <div className="serif text-xl font-semibold text-green-700">₹{summary.collected.toLocaleString()}</div>
          </div>
          <div className="bg-white border border-[#E6E7E2] rounded-2xl p-3.5">
            <div className="text-[11px] text-slate-500 mb-1">Pending</div>
            <div className="serif text-xl font-semibold text-red-600">₹{summary.pending.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-3">
        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-9 w-9 border-b-2 border-green-600" /></div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-slate-500"><IndianRupee className="w-10 h-10 mx-auto mb-3 opacity-40" /><p>Koi client nahi mila</p></div>
        ) : (
          <div className="space-y-2">
            {rows.map(r => (
              <div key={r.client_id} onClick={() => openClient(r)}
                className="flex items-center gap-3 bg-white border border-[#E6E7E2] rounded-2xl p-3.5 cursor-pointer active:scale-[.98] active:bg-[#F2F5F1] transition">
                <div className="w-11 h-11 rounded-full bg-[#E7F2EC] text-[#0C5C40] flex items-center justify-center serif font-semibold flex-shrink-0">{initials(r.name)}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-[#15191E] truncate">{r.name}</div>
                  <div className="text-xs text-slate-500 truncate">Paid ₹{r.total_paid.toLocaleString()}</div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${r.balance > 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
                  {r.balance > 0 ? `₹${r.balance.toLocaleString()}` : "Clear"}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {sheetClient && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-end sm:items-center justify-center" onClick={closeSheet}>
          <div onClick={e => e.stopPropagation()} className="bg-[#FBFBF9] w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 pb-8 sm:pb-6 max-h-[88%] overflow-y-auto">
            <div className="w-9 h-1 bg-slate-300 rounded-full mx-auto mb-4 sm:hidden" />
            <div className="flex items-center justify-between mb-4">
              <div><div className="font-bold text-base">{sheetClient.name}</div><div className="text-xs text-slate-500">{sheetClient.business_name || sheetClient.mobile}</div></div>
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
                        <td className="py-1.5">{r.period_key}</td><td className="py-1.5 text-right">₹{r.due}</td><td className="py-1.5 text-right">₹{r.paid}</td>
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

                <div className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Payment record karo</div>
                <div className="flex gap-2 mb-2">
                  <input value={amount} onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ""))} placeholder="Amount (₹)"
                    className="flex-1 border border-[#E6E7E2] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-600" />
                  <select value={method} onChange={e => setMethod(e.target.value)} className="border border-[#E6E7E2] rounded-xl px-2 py-2.5 text-sm bg-white">
                    <option>UPI</option><option>Cash</option><option>Bank</option>
                  </select>
                </div>
                <button onClick={recordPayment} disabled={saving || !amount} className="w-full py-3 rounded-xl bg-green-700 text-white font-semibold text-sm disabled:opacity-60 mb-4">
                  {saving ? "Save ho raha..." : "Record Karo"}
                </button>

                {ledger.payments.length > 0 && (
                  <>
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Recent payments</div>
                    <div className="space-y-1.5">
                      {ledger.payments.slice(0, 8).map(p => (
                        <div key={p.id} className="flex items-center justify-between bg-white border border-[#E6E7E2] rounded-xl px-3 py-2 text-sm">
                          <div><span className="font-semibold">₹{p.amount.toLocaleString()}</span> <span className="text-slate-400 text-xs">· {p.method || "—"} · {p.paid_on}</span></div>
                          <button onClick={() => removePayment(p.id)} className="text-red-500 text-xs font-semibold">Delete</button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : <div className="text-sm text-slate-500 text-center py-6">Ledger load nahi hua</div>}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed left-4 right-4 bottom-6 md:left-auto md:right-8 md:w-80 bg-[#1D2420] text-white rounded-xl px-4 py-3 flex items-center justify-between gap-3 shadow-xl z-50">
          <span className="text-sm">{toast.msg}</span>
          {toast.undoId && <button onClick={() => undo(toast.undoId!)} className="text-green-400 font-bold text-sm flex-shrink-0">UNDO</button>}
        </div>
      )}
    </div>
  );
}
