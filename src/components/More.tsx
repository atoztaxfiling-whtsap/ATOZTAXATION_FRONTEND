import { useState } from "react";
import { Users, Wrench, ClipboardCheck, Sparkles, IndianRupee, Megaphone, BarChart3 } from "lucide-react";
import Registrations from "./Registrations";
import Staff from "./Staff";
import Services from "./Services";
import Payments from "./Payments";
import ReturnsCampaigns from "./ReturnsCampaigns";
import Analytics from "./Analytics";

type SubView = "registrations" | "staff" | "services" | "payments" | "returns" | "analytics" | null;

export default function More() {
  const [view, setView] = useState<SubView>(null);

  if (view === "registrations") return <Registrations onBack={() => setView(null)} />;
  if (view === "staff") return <Staff onBack={() => setView(null)} />;
  if (view === "services") return <Services onBack={() => setView(null)} />;
  if (view === "payments") return (
    <div className="h-full flex flex-col">
      <div className="bg-[#FBFBF9] px-5 pt-5 pb-1 border-b border-[#E6E7E2]"><button onClick={() => setView(null)} className="text-green-700 font-semibold text-sm">‹ More</button></div>
      <div className="flex-1 overflow-hidden"><Payments /></div>
    </div>
  );
  if (view === "returns") return (
    <div className="h-full flex flex-col">
      <div className="bg-[#FBFBF9] px-5 pt-5 pb-1 border-b border-[#E6E7E2]"><button onClick={() => setView(null)} className="text-green-700 font-semibold text-sm">‹ More</button></div>
      <div className="flex-1 overflow-hidden"><ReturnsCampaigns /></div>
    </div>
  );
  if (view === "analytics") return (
    <div className="h-full flex flex-col">
      <div className="bg-[#FBFBF9] px-5 pt-5 pb-1 border-b border-[#E6E7E2]"><button onClick={() => setView(null)} className="text-green-700 font-semibold text-sm">‹ More</button></div>
      <div className="flex-1 overflow-hidden"><Analytics /></div>
    </div>
  );

  const tiles: Array<{ key: SubView; icon: JSX.Element; title: string; sub: string }> = [
    { key: "payments", icon: <IndianRupee className="w-5 h-5" />, title: "Payments", sub: "Ledger + collection" },
    { key: "registrations", icon: <ClipboardCheck className="w-5 h-5" />, title: "Registrations", sub: "Naye GST cases" },
    { key: "staff", icon: <Users className="w-5 h-5" />, title: "Staff", sub: "Team members" },
    { key: "services", icon: <Wrench className="w-5 h-5" />, title: "Services", sub: "Fees list" },
    { key: "returns", icon: <Megaphone className="w-5 h-5" />, title: "Returns", sub: "Bulk campaigns" },
    { key: "analytics", icon: <BarChart3 className="w-5 h-5" />, title: "Analytics", sub: "Numbers, ek nazar" },
  ];

  return (
    <div className="h-full overflow-y-auto bg-[#F2F5F1] p-5">
      <h2 className="serif text-2xl font-semibold text-[#15191E] mb-4">More</h2>
      <div className="grid grid-cols-2 gap-3">
        {tiles.map(t => (
          <button key={t.key} onClick={() => setView(t.key)}
            className="flex flex-col items-start gap-2.5 bg-white border border-[#E6E7E2] rounded-2xl p-4 text-left active:bg-[#F2F5F1] transition">
            <div className="w-10 h-10 rounded-xl bg-[#E7F2EC] text-[#0C5C40] flex items-center justify-center">{t.icon}</div>
            <div><div className="font-semibold text-sm">{t.title}</div><div className="text-xs text-slate-500">{t.sub}</div></div>
          </button>
        ))}
        <button onClick={() => alert("AI Command Box — jald aa raha hai")}
          className="flex flex-col items-start gap-2.5 bg-white border border-[#E6E7E2] rounded-2xl p-4 text-left active:bg-[#F2F5F1] transition">
          <div className="w-10 h-10 rounded-xl bg-[#E7F2EC] text-[#0C5C40] flex items-center justify-center"><Sparkles className="w-5 h-5" /></div>
          <div><div className="font-semibold text-sm">AI Command</div><div className="text-xs text-slate-500">Bol ke kaam karo</div></div>
        </button>
      </div>
    </div>
  );
}
