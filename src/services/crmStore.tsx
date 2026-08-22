/* ============================================================
   crmStore.tsx — saara CRM data ek jagah (demo ki tarah)
   ============================================================
   Ek hi baar sab load hota hai, phir har screen usi se padhti
   hai. Koi change karo to reload() chalta hai — bilkul demo ke
   renderAll() jaisa.
   ============================================================ */
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { fetchBootstrap } from "./crmApi";
import { buildFilingMap, type Bootstrap, type Filing } from "./crmLogic";

interface CrmCtx extends Bootstrap {
  filingMap: Record<string, Filing>;
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
  toast: (msg: string, undo?: () => Promise<void>) => void;
  /* instant UI ke liye — server jawab ka intezaar kiye bina local list turant badal do */
  patchLocal: (table: keyof Bootstrap, id: string, partial: Record<string, unknown>) => void;
  removeLocal: (table: keyof Bootstrap, id: string) => void;
}

const EMPTY: Bootstrap = { clients: [], filings: [], payments: [], registrations: [], tasks: [], staff: [], services: [], notes: [], followups: [], escalations: [] };
const Ctx = createContext<CrmCtx | null>(null);

export function useCrm() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCrm must be used inside <CrmProvider>");
  return c;
}

export function CrmProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Bootstrap>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toastMsg, setToastMsg] = useState<{ msg: string; undo?: () => Promise<void> } | null>(null);

  const reload = useCallback(async () => {
    try { setData(await fetchBootstrap()); setError(""); }
    catch (e) { if ((e as Error).message !== "UNAUTHORIZED") setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);

  const patchLocal = useCallback((table: keyof Bootstrap, id: string, partial: Record<string, unknown>) => {
    setData(d => {
      const arr = (d as unknown as Record<string, unknown>)[table];
      if (!Array.isArray(arr)) return d;
      return { ...d, [table]: arr.map((x: { id?: string }) => x.id === id ? { ...x, ...partial } : x) };
    });
  }, []);
  const removeLocal = useCallback((table: keyof Bootstrap, id: string) => {
    setData(d => {
      const arr = (d as unknown as Record<string, unknown>)[table];
      if (!Array.isArray(arr)) return d;
      return { ...d, [table]: arr.filter((x: { id?: string }) => x.id !== id) };
    });
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { if (!toastMsg) return; const t = setTimeout(() => setToastMsg(null), 5000); return () => clearTimeout(t); }, [toastMsg]);

  const toast = useCallback((msg: string, undo?: () => Promise<void>) => setToastMsg({ msg, undo }), []);

  const value: CrmCtx = { ...data, filingMap: buildFilingMap(data.filings), loading, error, reload, toast, patchLocal, removeLocal };

  return (
    <Ctx.Provider value={value}>
      {children}
      {toastMsg && (
        <div className="fixed left-4 right-4 bottom-24 md:left-auto md:right-8 md:w-96 bg-[#1D2420] text-white rounded-xl px-4 py-3 flex items-center justify-between gap-3 shadow-2xl z-[100]">
          <span className="text-sm">{toastMsg.msg}</span>
          {toastMsg.undo && (
            <button
              onClick={async () => { const fn = toastMsg.undo!; setToastMsg(null); await fn(); await reload(); }}
              className="text-[#8FE3BE] font-bold text-sm flex-shrink-0">UNDO</button>
          )}
        </div>
      )}
    </Ctx.Provider>
  );
}
