import { TrendingUp, Users, Clock, CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchDailySummary } from "../services/api";
export default function Analytics() {
  const [a, setA] = useState({ totalMessages: 0, totalClients: 0, responseRate: 0 });
  useEffect(() => { fetchDailySummary().then(setA).catch(() => {}); }, []);
  const metrics = [{ label: "Total Messages", value: a.totalMessages, icon: TrendingUp }, { label: "Active Clients", value: a.totalClients, icon: Users }, { label: "Response Rate", value: `${a.responseRate}%`, icon: CheckCircle }, { label: "Avg Response", value: "2.4s", icon: Clock }];
  return (
    <div className="p-6 space-y-6">
      <div><h2 className="text-2xl font-bold">Analytics</h2><p className="text-slate-600 mt-1">ATOZ Taxation — Performance</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{metrics.map((m, i) => { const I = m.icon; return (<div key={i} className="bg-white rounded-xl p-5 border"><I className="w-6 h-6 text-green-600 mb-3" /><h3 className="text-2xl font-bold">{m.value}</h3><p className="text-sm text-slate-600 mt-1">{m.label}</p></div>); })}</div>
      <div className="bg-white rounded-xl p-6 border"><h3 className="text-lg font-semibold mb-4">Client Satisfaction</h3><div className="flex items-center gap-4"><div className="flex-1 bg-slate-200 rounded-full h-3"><div className="bg-green-500 h-3 rounded-full" style={{ width: '94%' }} /></div><span className="text-sm font-medium">94%</span></div></div>
    </div>
  );
}
