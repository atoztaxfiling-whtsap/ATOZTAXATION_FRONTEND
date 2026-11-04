/* ============================================================
   crmStore.tsx — saara CRM data ek jagah (demo ki tarah)
   ============================================================
   Ek hi baar sab load hota hai, phir har screen usi se padhti
   hai. Koi change karo to reload() chalta hai — bilkul demo ke
   renderAll() jaisa.
   ============================================================ */
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { fetchBootstrap } from "./crmApi";
import { buildFilingMap, type Bootstrap, type Filing, type Me, type Perm } from "./crmLogic";

interface CrmCtx extends Bootstrap {
  filingMap: Record<string, Filing>;
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
  toast: (msg: string, undo?: () => Promise<void>) => void;
  /* instant UI ke liye — server jawab ka intezaar kiye bina local list turant badal do */
  patchLocal: (table: keyof Bootstrap, id: string, partial: Record<string, unknown>) => void;
  removeLocal: (table: keyof Bootstrap, id: string) => void;
  /* abhi kaun logged-in + kya kar sakta */
  me: Me;
  can: (perm: Perm | string) => boolean;
}

const EMPTY: Bootstrap = { clients: [], filings: [], payments: [], registrations: [], tasks: [], staff: [], services: [], notes: [], followups: [], escalations: [], autopilot_pending: [] };
// jab tak bootstrap nahi aaya — kuch mat dikhao (sabse surakshit default)
const NOBODY: Me = { name: "", role: "staff", owner: false, permissions: {} };
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

  // Console token = owner ki master key. Wo localStorage me hai to owner maano —
  // chahe bootstrap me `me` kisi wajah se na aaye. (Backend bhi token verify karta.)
  const hasConsole = (() => { try { return !!localStorage.getItem("console_token"); } catch { return false; } })();
  const baseMe: Me = data.me || NOBODY;
  const me: Me = { ...baseMe, owner: baseMe.owner || hasConsole };
  const can = useCallback((perm: Perm | string) => {
    if (me.owner) return true;
    return !!me.permissions?.[perm];
  }, [me]);

  const value: CrmCtx = { ...data, me, can, filingMap: buildFilingMap(data.filings), loading, error, reload, toast, patchLocal, removeLocal };

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
