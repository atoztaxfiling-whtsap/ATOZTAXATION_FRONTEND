import { useState } from 'react';
import { SquarePen, MoreVertical, Search } from 'lucide-react';
import { getAvatarColor, getInitials } from './chatTypes';
import type { Thread } from './chatTypes';

interface Props { threads: Thread[]; selectedMobile: string | null; onSelectThread: (m: string) => void; isMobile: boolean; unreadCounts: Record<string, number>; onNewChat: () => void; }

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

export default function ChatSidebar({ threads, selectedMobile, onSelectThread, isMobile, unreadCounts, onNewChat }: Props) {
  const [q, setQ] = useState('');
  if (isMobile && selectedMobile) return null;

  const filtered = threads.filter(t => { const l = (t.name || t.mobile).toLowerCase(); return l.includes(q.toLowerCase()) || t.mobile.includes(q); });

  return (
    <div className={`${isMobile ? 'w-full' : 'w-[360px]'} flex flex-col flex-shrink-0`} style={{ background: '#fff', borderRight: '1px solid #E6E7E2' }}>
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ background: '#127A56' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
            <img src="/icon-192.png" alt="ATOZ" className="w-8 h-8 object-contain" />
          </div>
          <div className="leading-tight">
            <div className="serif text-white font-semibold text-base tracking-tight">ATOZ<span style={{ opacity: 0.65 }}>.</span></div>
            <div className="text-white font-semibold" style={{ fontSize: '9px', letterSpacing: '0.28em', opacity: 0.75 }}>TAXATION</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onNewChat} title="New chat" className="p-2 rounded-full text-white hover:bg-white/20 transition"><SquarePen size={20} /></button>
          <button className="p-2 rounded-full text-white hover:bg-white/20 transition"><MoreVertical size={20} /></button>
        </div>
      </div>
      <div className="px-3 py-2 flex-shrink-0">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#F2F5F1' }}>
          <Search size={16} style={{ color: '#5A6168' }} />
          <input type="text" placeholder="Search or start new chat" value={q} onChange={e => setQ(e.target.value)} className="flex-1 bg-transparent text-sm focus:outline-none" style={{ color: '#15191E' }} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && <div className="p-8 text-center text-sm" style={{ color: '#5A6168' }}>{q ? 'No chats found' : 'No chats yet'}</div>}
        {filtered.map(t => {
          const label = t.name || t.mobile, ini = getInitials(label), col = getAvatarColor(label), ur = unreadCounts[t.mobile] ?? t.unread ?? 0, active = selectedMobile === t.mobile;
          return (
            <div key={t.mobile} onClick={() => onSelectThread(t.mobile)} className="flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors"
              style={{ background: active ? '#F2F5F1' : undefined, borderBottom: '1px solid #F2F5F1' }}
              onMouseEnter={e => { if (!active) (e.currentTarget).style.background = '#FAFBF8'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget).style.background = ''; }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0" style={{ background: col }}>{ini}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-semibold text-sm truncate" style={{ color: '#15191E' }}>{label}</span>
                  <span className="text-xs ml-2 flex-shrink-0" style={{ color: ur > 0 ? '#127A56' : '#5A6168' }}>{fmtTime(t.timestamp)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm truncate" style={{ color: '#5A6168' }}>{t.lastMessage || ''}</p>
                  {ur > 0 && <div className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold ml-2 flex-shrink-0" style={{ background: '#127A56', fontSize: '11px' }}>{ur > 99 ? '99+' : ur}</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
