import { MessageSquare, Users, FileText, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchDailySummary } from "../services/api";
type Summary = { totalMessages: number; totalClients: number; docsReceived: number; returnsSent: number; responseRate: number; };
export default function Dashboard() {
  const [s, setS] = useState<Summary>({ totalMessages: 0, totalClients: 0, docsReceived: 0, returnsSent: 0, responseRate: 0 });
  useEffect(() => { fetchDailySummary().then(setS).catch(() => {}); }, []);
  const stats = [
    { label: "Total Messages", value: s.totalMessages, icon: MessageSquare, color: "blue" },
    { label: "Active Clients", value: s.totalClients, icon: Users, color: "green" },
    { label: "Documents", value: s.docsReceived, icon: FileText, color: "cyan" },
    { label: "Response Rate", value: `${s.responseRate}%`, icon: CheckCircle, color: "emerald" },
  ];
  return (
    <div className="p-6 space-y-6">
      <div><h2 className="text-2xl font-bold text-slate-900">Dashboard</h2><p className="text-slate-600 mt-1">ATOZ Taxation — WhatsApp Console</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((st, i) => { const I = st.icon; return (<div key={i} className="bg-white rounded-xl p-5 border border-slate-200"><I className="w-6 h-6 text-green-600 mb-3" /><h3 className="text-2xl font-bold text-slate-900">{st.value}</h3><p className="text-sm text-slate-600 mt-1">{st.label}</p></div>); })}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border"><div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold">Recent Activity</h3><Clock className="w-5 h-5 text-slate-400" /></div><div className="p-3 rounded-lg bg-slate-50"><p className="text-sm font-medium">Live data from backend</p><p className="text-xs text-slate-600 mt-1">Messages fetched in real-time</p></div></div>
        <div className="bg-white rounded-xl p-6 border"><div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold">System Status</h3><div className="w-2 h-2 bg-green-500 rounded-full" /></div>{["WhatsApp","OpenAI API","Google Sheets","Follow-up Engine"].map(i => (<div key={i} className="flex items-center justify-between p-3 bg-green-50 rounded-lg mb-2"><span className="text-sm font-medium">{i}</span><span className="text-xs text-green-600 font-medium">Active</span></div>))}</div>
      </div>
      <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl p-8 text-white"><div className="flex items-center justify-between"><div><h3 className="text-2xl font-bold mb-2">ATOZ Taxation</h3><p className="text-green-100">WhatsApp AI Assistant — Live</p></div><TrendingUp className="w-12 h-12 text-green-200" /></div></div>
    </div>
  );
}
