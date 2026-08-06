import { useEffect, useState } from "react";
import { Search, User, FileText, Building2, Tag } from "lucide-react";
import { fetchClients } from "../services/api";
interface Client { name: string; mobile: string; business: string; service: string; sheet: string; }
export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]); const [search, setSearch] = useState(""); const [filter, setFilter] = useState("all"); const [loading, setLoading] = useState(false);
  useEffect(() => { setLoading(true); fetchClients().then(setClients).catch(() => {}).finally(() => setLoading(false)); }, []);
  const filtered = clients.filter(c => { const m = (c.name?.toLowerCase().includes(search.toLowerCase()) || c.mobile.includes(search) || c.business?.toLowerCase().includes(search.toLowerCase())); return m && (filter === "all" || c.sheet === filter); });
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between"><div><h2 className="text-2xl font-bold">Clients</h2><p className="text-slate-600 mt-1">ATOZ Taxation client database</p></div><div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg"><User className="w-5 h-5 text-green-600" /><span className="text-sm font-medium text-green-600">{clients.length} Total</span></div></div>
      <div className="bg-white rounded-xl p-4 border"><div className="flex flex-col sm:flex-row gap-4"><div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" /><input type="text" placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" /></div><select value={filter} onChange={e => setFilter(e.target.value)} className="px-4 py-2 border rounded-lg"><option value="all">All Services</option><option value="GST">GST</option><option value="IT">IT</option></select></div></div>
      {loading ? <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" /></div> :
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{filtered.map((c, i) => (<div key={i} className="bg-white rounded-xl p-5 border hover:shadow-lg transition"><div className="flex items-start justify-between mb-3"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center"><User className="w-5 h-5 text-white" /></div><div><h3 className="font-semibold text-slate-900">{c.name}</h3><p className="text-sm text-slate-600">{c.mobile}</p></div></div><span className={`px-3 py-1 rounded-full text-xs font-medium ${c.sheet === "GST" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>{c.sheet}</span></div><div className="space-y-1"><div className="flex items-center gap-2 text-sm text-slate-600"><Building2 className="w-4 h-4" /><span>{c.business}</span></div><div className="flex items-center gap-2 text-sm text-slate-600"><Tag className="w-4 h-4" /><span>{c.service}</span></div></div></div>))}
      {filtered.length === 0 && <div className="col-span-2 bg-white rounded-xl p-12 text-center border"><FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" /><p className="text-slate-600">No clients found</p></div>}</div>}
    </div>
  );
}
