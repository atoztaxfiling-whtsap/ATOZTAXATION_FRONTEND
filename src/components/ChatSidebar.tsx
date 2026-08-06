import { useState } from 'react';
import { MessageCircle, MoreVertical, Search } from 'lucide-react';
import { getAvatarColor, getInitials } from './chatTypes';
import type { Thread } from './chatTypes';

interface Props { threads: Thread[]; selectedMobile: string | null; onSelectThread: (m: string) => void; isMobile: boolean; unreadCounts: Record<string, number>; }

function fmtTime(ts?: string): string {
  if (!ts) return '';
  try {
    const d = new Date(ts); if (isNaN(d.getTime())) return ts;
    const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yest = new Date(today.getTime() - 86400000), week = new Date(today.getTime() - 6 * 86400000);
    const md = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (md >= today) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (md >= yest) return 'Yesterday';
    if (md >= week) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  } catch { return ts; }
}

export default function ChatSidebar({ threads, selectedMobile, onSelectThread, isMobile, unreadCounts }: Props) {
  const [q, setQ] = useState('');
  if (isMobile && selectedMobile) return null;

  const filtered = threads.filter(t => { const l = (t.name || t.mobile).toLowerCase(); return l.includes(q.toLowerCase()) || t.mobile.includes(q); });

  return (
    <div className={`${isMobile ? 'w-full' : 'w-[360px]'} flex flex-col flex-shrink-0`} style={{ background: '#fff', borderRight: '1px solid #e9edef' }}>
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ background: '#00a884' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>AT</div>
          <span className="text-white font-bold text-lg tracking-tight">ATOZ Taxation</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-full text-white hover:bg-white/20 transition"><MessageCircle size={20} /></button>
          <button className="p-2 rounded-full text-white hover:bg-white/20 transition"><MoreVertical size={20} /></button>
        </div>
      </div>
      <div className="px-3 py-2 flex-shrink-0">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#f0f2f5' }}>
          <Search size={16} style={{ color: '#54656f' }} />
          <input type="text" placeholder="Search or start new chat" value={q} onChange={e => setQ(e.target.value)} className="flex-1 bg-transparent text-sm focus:outline-none" style={{ color: '#111b21' }} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && <div className="p-8 text-center text-sm" style={{ color: '#667781' }}>{q ? 'No chats found' : 'No chats yet'}</div>}
        {filtered.map(t => {
          const label = t.name || t.mobile, ini = getInitials(label), col = getAvatarColor(label), ur = unreadCounts[t.mobile] ?? t.unread ?? 0, active = selectedMobile === t.mobile;
          return (
            <div key={t.mobile} onClick={() => onSelectThread(t.mobile)} className="flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors"
              style={{ background: active ? '#f0f2f5' : undefined, borderBottom: '1px solid #f0f2f5' }}
              onMouseEnter={e => { if (!active) (e.currentTarget).style.background = '#f5f6f6'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget).style.background = ''; }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0" style={{ background: col }}>{ini}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-semibold text-sm truncate" style={{ color: '#111b21' }}>{label}</span>
                  <span className="text-xs ml-2 flex-shrink-0" style={{ color: ur > 0 ? '#00a884' : '#667781' }}>{fmtTime(t.timestamp)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm truncate" style={{ color: '#667781' }}>{t.lastMessage || ''}</p>
                  {ur > 0 && <div className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold ml-2 flex-shrink-0" style={{ background: '#00a884', fontSize: '11px' }}>{ur > 99 ? '99+' : ur}</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
