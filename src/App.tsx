import { useState, useEffect } from "react";
import {
  LayoutDashboard, MessageCircle, Users, Phone, CreditCard, FileText,
  CheckSquare, UserPlus, Settings as SettingsIcon, BarChart3, Megaphone, MoreHorizontal, LogOut,
  Sparkles,
} from "lucide-react";
import Chat from "./components/Chat";
import CrmDashboard from "./components/crm/CrmDashboard";
import Clients from "./components/crm/Clients";
import Followups from "./components/crm/Followups";
import Payments from "./components/crm/Payments";
import Filings from "./components/crm/Filings";
import Workflow from "./components/crm/Workflow";
import Registrations from "./components/crm/Registrations";
import Settings from "./components/crm/Settings";
import ClientDrawer from "./components/crm/ClientDrawer";
import GlobalSearch from "./components/crm/GlobalSearch";
import AiBox from "./components/crm/AiBox";
import Dashboard from "./components/Dashboard";
import ReturnsCampaigns from "./components/ReturnsCampaigns";
import Analytics from "./components/Analytics";
import TokenLogin from "./components/TokenLogin";
import { hasToken, clearToken } from "./services/api";
import { setupPushNotifications } from "./services/push";
import { CrmProvider, useCrm } from "./services/crmStore";
import { isDefaulter, type Client } from "./services/crmLogic";

type Tab =
  | "chat" | "dashboard" | "clients" | "followups" | "payments" | "filings"
  | "workflow" | "registrations" | "setup" | "returns" | "analytics" | "notifications" | "more";

const ICONS: Record<string, JSX.Element> = {
  chat: <MessageCircle className="w-4 h-4" />,
  dashboard: <LayoutDashboard className="w-4 h-4" />,
  clients: <Users className="w-4 h-4" />,
  followups: <Phone className="w-4 h-4" />,
  payments: <CreditCard className="w-4 h-4" />,
  filings: <FileText className="w-4 h-4" />,
  workflow: <CheckSquare className="w-4 h-4" />,
  registrations: <UserPlus className="w-4 h-4" />,
  setup: <SettingsIcon className="w-4 h-4" />,
  returns: <Megaphone className="w-4 h-4" />,
  analytics: <BarChart3 className="w-4 h-4" />,
  notifications: <LayoutDashboard className="w-4 h-4" />,
};

const WORKSPACE: Array<{ key: Tab; label: string }> = [
  { key: "chat", label: "Chat" },
  { key: "dashboard", label: "Dashboard" },
  { key: "clients", label: "Clients" },
  { key: "followups", label: "Followups" },
  { key: "payments", label: "Payments" },
  { key: "filings", label: "Filings" },
  { key: "workflow", label: "Workflow" },
  { key: "registrations", label: "Registrations" },
];
const EXTRAS: Array<{ key: Tab; label: string }> = [
  { key: "setup", label: "Staff & Services" },
  { key: "returns", label: "Returns campaigns" },
  { key: "analytics", label: "Analytics" },
  { key: "notifications", label: "Notifications" },
];
const MOBILE_NAV: Array<{ key: Tab; label: string }> = [
  { key: "chat", label: "Chat" },
  { key: "dashboard", label: "Home" },
  { key: "clients", label: "Clients" },
  { key: "filings", label: "Filings" },
  { key: "more", label: "More" },
];

export default function App() {
  const [auth, setAuth] = useState(hasToken());
  useEffect(() => { const h = () => setAuth(false); window.addEventListener("auth-failed", h); return () => window.removeEventListener("auth-failed", h); }, []);
  useEffect(() => { if (auth) setupPushNotifications().catch(() => {}); }, [auth]);
  if (!auth) return <TokenLogin onSuccess={() => setAuth(true)} />;
  return <CrmProvider><Shell onLogout={() => { clearToken(); setAuth(false); }} /></CrmProvider>;
}

function Shell({ onLogout }: { onLogout: () => void }) {
  const { clients, filingMap, staff } = useCrm();
  const [tab, setTab] = useState<Tab>("chat");
  const [isMobile, setIsMobile] = useState(false);
  const [drawer, setDrawer] = useState<Client | null>(null);
  const [ai, setAi] = useState(false);

  useEffect(() => { const c = () => setIsMobile(window.innerWidth < 900); c(); window.addEventListener("resize", c); return () => window.removeEventListener("resize", c); }, []);

  const followupCount = clients.filter(c => c.followup_text).length;
  const defaulterCount = clients.filter(c => isDefaulter(c, filingMap)).length;
  const badges: Partial<Record<Tab, number>> = { clients: clients.length, followups: followupCount, filings: defaulterCount };

  function screen(t: Tab) {
    switch (t) {
      case "chat": return <Chat />;
      case "dashboard": return <CrmDashboard />;
      case "clients": return <Clients />;
      case "followups": return <Followups />;
      case "payments": return <Payments />;
      case "filings": return <Filings />;
      case "workflow": return <Workflow />;
      case "registrations": return <Registrations />;
      case "setup": return <Settings />;
      case "returns": return <ReturnsCampaigns />;
      case "analytics": return <Analytics />;
      case "notifications": return <Dashboard />;
      case "more": return <MoreMenu onPick={setTab} />;
      default: return null;
    }
  }

  return (
    <div className="h-screen w-full flex bg-[#F6F5F1] overflow-hidden">
      {!isMobile && (
        <aside className="w-[216px] bg-[#182430] flex-shrink-0 flex flex-col p-3 overflow-y-auto">
          <div className="flex items-center gap-2.5 px-2 pt-1 pb-4">
            <div className="w-7 h-7 rounded-md bg-[#0F6E56] text-white font-bold text-[13px] font-mono flex items-center justify-center">AZ</div>
            <div><div className="text-white font-semibold text-[15px] leading-tight">ATOZ Taxation</div><div className="text-[#AEB8C4] text-[11px]">GST practice CRM</div></div>
          </div>
          <div className="px-1 pb-2">
            <GlobalSearch dark onPickClient={c => setDrawer(c)} onGoto={t => setTab(t as Tab)} />
          </div>
          <button onClick={() => setAi(true)}
            className="mx-1 mb-3 flex items-center gap-2 px-2.5 py-2 rounded-lg text-[13.5px] font-medium bg-[#0F6E56]/15 text-[#8FE3BE] hover:bg-[#0F6E56]/25 border border-[#0F6E56]/30">
            <Sparkles className="w-4 h-4" />AI command
          </button>
          <NavLabel>Workspace</NavLabel>
          {WORKSPACE.map(n => <NavItem key={n.key} tabKey={n.key} label={n.label} active={tab === n.key} badge={badges[n.key]} onClick={() => setTab(n.key)} />)}
          <div className="h-px bg-white/10 my-3 mx-1.5" />
          <NavLabel>Setup</NavLabel>
          {EXTRAS.map(n => <NavItem key={n.key} tabKey={n.key} label={n.label} active={tab === n.key} onClick={() => setTab(n.key)} />)}
          <div className="h-px bg-white/10 my-3 mx-1.5" />
          <NavLabel>Team</NavLabel>
          {staff.map(s => (
            <div key={s.id} className="flex items-center gap-2.5 px-2.5 py-1.5 text-[13px] text-[#AEB8C4]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0F6E56]" />{s.name}
            </div>
          ))}
          <button onClick={onLogout} className="mt-auto flex items-center gap-2 px-2.5 py-2 rounded-lg text-[13px] text-[#AEB8C4] hover:bg-[#232F3C] hover:text-white">
            <LogOut className="w-4 h-4" />Logout
          </button>
        </aside>
      )}

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {isMobile && tab !== "chat" && (
          <div className="bg-white border-b border-[#E6E4DD] px-4 py-2.5 flex-shrink-0">
            <GlobalSearch onPickClient={c => setDrawer(c)} onGoto={t => setTab(t as Tab)} />
          </div>
        )}
        <div className="flex-1 overflow-hidden">{screen(tab)}</div>

        {isMobile && (
          <nav className="flex border-t border-[#E6E4DD] bg-white flex-shrink-0 pb-[env(safe-area-inset-bottom,4px)]">
            {MOBILE_NAV.map(n => {
              const active = tab === n.key || (n.key === "more" && !MOBILE_NAV.some(x => x.key === tab));
              return (
                <button key={n.key} onClick={() => setTab(n.key)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2 ${active ? "text-[#0F6E56]" : "text-[#6B6F68]"}`}>
                  {n.key === "more" ? <MoreHorizontal className="w-4 h-4" /> : ICONS[n.key]}
                  <span className="text-[10.5px] font-semibold">{n.label}</span>
                </button>
              );
            })}
          </nav>
        )}
      </main>

      {!(isMobile && tab === "chat") && (
        <button onClick={() => setAi(true)} aria-label="AI command box"
          className="fixed right-4 bottom-[76px] md:bottom-6 md:right-6 rounded-full bg-[#0F6E56] text-white shadow-lg flex items-center justify-center z-40 active:scale-95 transition"
          style={{ width: 52, height: 52 }}>
          <Sparkles className="w-5 h-5" />
        </button>
      )}

      {ai && <AiBox onClose={() => setAi(false)} />}
      {drawer && <ClientDrawer client={clients.find(c => c.id === drawer.id) || drawer} onClose={() => setDrawer(null)} />}
    </div>
  );
}

function NavLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[#9BA098] text-[10.5px] uppercase tracking-wider px-2.5 mb-1.5">{children}</div>;
}

function NavItem({ tabKey, label, active, badge, onClick }: { tabKey: string; label: string; active: boolean; badge?: number; onClick: () => void }) {
  const icon = ICONS[tabKey] || null;
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13.5px] font-medium mb-0.5 text-left ${active ? "bg-[#0F6E56] text-white" : "text-[#AEB8C4] hover:bg-[#232F3C] hover:text-white"}`}>
      {icon}<span className="flex-1 truncate">{label}</span>
      {!!badge && <span className={`text-[10.5px] font-semibold px-1.5 rounded-full ${active ? "bg-white/25" : "bg-white/15"} text-white`}>{badge}</span>}
    </button>
  );
}

function MoreMenu({ onPick }: { onPick: (t: Tab) => void }) {
  const tiles: Array<{ key: Tab; label: string; sub: string }> = [
    { key: "followups", label: "Followups", sub: "Yaad rakhne wale kaam" },
    { key: "payments", label: "Payments", sub: "Ledger + collection" },
    { key: "workflow", label: "Workflow", sub: "Non-GST kaam" },
    { key: "registrations", label: "Registrations", sub: "Naye GST cases" },
    { key: "setup", label: "Staff & Services", sub: "Team, fees" },
    { key: "returns", label: "Returns campaigns", sub: "Bulk messages" },
    { key: "analytics", label: "Analytics", sub: "Numbers" },
    { key: "notifications", label: "Notifications", sub: "Push setup" },
  ];
  return (
    <div className="h-full overflow-y-auto bg-[#F6F5F1] p-5">
      <h1 className="text-xl font-semibold mb-4">More</h1>
      <div className="grid grid-cols-2 gap-3">
        {tiles.map(t => (
          <button key={t.key} onClick={() => onPick(t.key)}
            className="flex flex-col items-start gap-2.5 bg-white border border-[#E6E4DD] rounded-xl p-4 text-left active:bg-[#FBFAF7]">
            <div className="w-9 h-9 rounded-lg bg-[#E1F5EE] text-[#04342C] flex items-center justify-center">{ICONS[t.key] || <MoreHorizontal className="w-4 h-4" />}</div>
            <div><div className="font-semibold text-[13.5px]">{t.label}</div><div className="text-[11.5px] text-[#6B6F68]">{t.sub}</div></div>
          </button>
        ))}
      </div>
      <div className="h-8" />
    </div>
  );
}
