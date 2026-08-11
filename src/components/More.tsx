import { useState } from "react";
import { Users, Wrench, ClipboardCheck, Sparkles } from "lucide-react";
import Registrations from "./Registrations";
import Staff from "./Staff";
import Services from "./Services";

type SubView = "registrations" | "staff" | "services" | null;

export default function More() {
  const [view, setView] = useState<SubView>(null);

  if (view === "registrations") return <Registrations onBack={() => setView(null)} />;
  if (view === "staff") return <Staff onBack={() => setView(null)} />;
  if (view === "services") return <Services onBack={() => setView(null)} />;

  const tiles: Array<{ key: SubView; icon: JSX.Element; title: string; sub: string; onClick?: () => void }> = [
    { key: "registrations", icon: <ClipboardCheck className="w-5 h-5" />, title: "Registrations", sub: "Naye GST cases" },
    { key: "staff", icon: <Users className="w-5 h-5" />, title: "Staff", sub: "Team members" },
    { key: "services", icon: <Wrench className="w-5 h-5" />, title: "Services", sub: "Fees list" },
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
