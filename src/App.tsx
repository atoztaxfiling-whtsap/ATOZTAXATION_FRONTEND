import { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import Chat from "./components/Chat";
import Clients from "./components/Clients";
import ReturnsCampaigns from "./components/ReturnsCampaigns";
import Analytics from "./components/Analytics";
import TokenLogin from "./components/TokenLogin";
import { hasToken, clearToken } from "./services/api";
import { setupPushNotifications } from "./services/push";

type Tab = "dashboard" | "chat" | "clients" | "returns" | "analytics";

export default function App() {
  const [tab, setTab] = useState<Tab>("chat");
  const [isMobile, setIsMobile] = useState(false);
  const [auth, setAuth] = useState(hasToken());

  useEffect(() => { const c = () => setIsMobile(window.innerWidth < 768); c(); window.addEventListener("resize", c); return () => window.removeEventListener("resize", c); }, []);
  useEffect(() => { const h = () => setAuth(false); window.addEventListener("auth-failed", h); return () => window.removeEventListener("auth-failed", h); }, []);
  useEffect(() => { if (auth) setupPushNotifications().catch(() => {}); }, [auth]);

  if (!auth) return <TokenLogin onSuccess={() => setAuth(true)} />;

  return (
    <div className="h-screen w-full bg-[#f5f7fb] overflow-hidden flex">
      {!isMobile && (
        <div className="w-56 bg-white border-r flex flex-col">
          <div className="p-4 font-bold border-b text-green-700 text-lg">ATOZ Taxation</div>
          {(["dashboard","chat","clients","returns","analytics"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`p-3 text-left capitalize transition text-base ${tab === t ? "bg-green-50 text-green-700 font-semibold" : "hover:bg-slate-100"}`}>{t}</button>
          ))}
          <div className="mt-auto p-3 border-t">
            <button onClick={() => { clearToken(); setAuth(false); }} className="w-full text-sm text-red-600 hover:bg-red-50 p-2 rounded transition">Logout</button>
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        {isMobile && (
          <div className="h-14 bg-white border-b flex justify-around items-center font-semibold">
            {(["dashboard","chat","clients","returns","analytics"] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 capitalize rounded-lg transition text-sm ${tab === t ? "bg-green-600 text-white" : "text-slate-700"}`}>{t}</button>
            ))}
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          {tab === "dashboard" && <Dashboard />}
          {tab === "chat" && <Chat />}
          {tab === "clients" && <Clients />}
          {tab === "returns" && <ReturnsCampaigns />}
          {tab === "analytics" && <Analytics />}
        </div>
      </div>
    </div>
  );
}
