import { useState, useEffect } from "react";
import { LayoutDashboard, MessageCircle, Users, FileText, MoreHorizontal } from "lucide-react";
import Dashboard from "./components/Dashboard";
import Chat from "./components/Chat";
import Clients from "./components/Clients";
import Filings from "./components/Filings";
import More from "./components/More";
import TokenLogin from "./components/TokenLogin";
import { hasToken, clearToken } from "./services/api";
import { setupPushNotifications } from "./services/push";

type Tab = "dashboard" | "chat" | "clients" | "filings" | "more";

const NAV: Array<{ key: Tab; label: string; icon: JSX.Element }> = [
  { key: "chat", label: "Chat", icon: <MessageCircle className="w-5 h-5" /> },
  { key: "dashboard", label: "Home", icon: <LayoutDashboard className="w-5 h-5" /> },
  { key: "clients", label: "Clients", icon: <Users className="w-5 h-5" /> },
  { key: "filings", label: "Filings", icon: <FileText className="w-5 h-5" /> },
  { key: "more", label: "More", icon: <MoreHorizontal className="w-5 h-5" /> },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("chat");
  const [isMobile, setIsMobile] = useState(false);
  const [auth, setAuth] = useState(hasToken());

  useEffect(() => { const c = () => setIsMobile(window.innerWidth < 768); c(); window.addEventListener("resize", c); return () => window.removeEventListener("resize", c); }, []);
  useEffect(() => { const h = () => setAuth(false); window.addEventListener("auth-failed", h); return () => window.removeEventListener("auth-failed", h); }, []);
  useEffect(() => { if (auth) setupPushNotifications().catch(() => {}); }, [auth]);

  if (!auth) return <TokenLogin onSuccess={() => setAuth(true)} />;

  return (
    <div className="h-screen w-full bg-[#FBFBF9] overflow-hidden flex">
      {!isMobile && (
        <div className="w-56 bg-white border-r flex flex-col">
          <div className="p-4 font-bold border-b text-green-700 text-lg">ATOZ Taxation</div>
          {NAV.map(n => (
            <button key={n.key} onClick={() => setTab(n.key)} className={`p-3 flex items-center gap-3 text-left transition text-base ${tab === n.key ? "bg-green-50 text-green-700 font-semibold" : "hover:bg-slate-100"}`}>
              {n.icon}{n.label}
            </button>
          ))}
          <div className="mt-auto p-3 border-t">
            <button onClick={() => { clearToken(); setAuth(false); }} className="w-full text-sm text-red-600 hover:bg-red-50 p-2 rounded transition">Logout</button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden">
          {tab === "dashboard" && <Dashboard />}
          {tab === "chat" && <Chat />}
          {tab === "clients" && <Clients />}
          {tab === "filings" && <Filings />}
          {tab === "more" && <More />}
        </div>

        {isMobile && (
          <div className="flex border-t border-[#E6E7E2] bg-white flex-shrink-0 pb-[env(safe-area-inset-bottom,4px)]">
            {NAV.map(n => (
              <button key={n.key} onClick={() => setTab(n.key)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 transition ${tab === n.key ? "text-green-700" : "text-slate-500"}`}>
                {n.icon}
                <span className="text-[11px] font-semibold">{n.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
