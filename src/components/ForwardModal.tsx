import { useState } from 'react';
import { X, Search, Send } from 'lucide-react';
import { forwardMessage } from '../services/api';
import { getAvatarColor, getInitials } from './chatTypes';
import type { FlatMessage, Thread } from './chatTypes';

interface Props { message: FlatMessage; threads: Thread[]; onClose: () => void; }

export default function ForwardModal({ message, threads, onClose }: Props) {
  const [q, setQ] = useState('');
  const [sending, setSending] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [error, setError] = useState('');

  const filtered = threads.filter(t => {
    const l = (t.name || t.mobile).toLowerCase();
    return l.includes(q.toLowerCase()) || t.mobile.includes(q);
  });

  const handleForward = async (mobile: string) => {
    setSending(mobile); setError('');
    try {
      const t = message.text.trim();
      const isMedia = /^https?:\/\/\S+$/i.test(t) && !t.includes(' ');
      const ok = isMedia
        ? await forwardMessage(mobile, '', t)
        : await forwardMessage(mobile, message.text);
      if (ok) { setDone(p => [...p, mobile]); }
      else setError('Forward fail hua');
    } catch (e) {
      setError((e as Error).message === 'UNAUTHORIZED' ? 'Token expired' : 'Forward fail hua');
    } finally { setSending(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-base" style={{ color: '#111b21' }}>Forward message</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100"><X size={18} style={{ color: '#667781' }} /></button>
        </div>

        {/* Message preview */}
        <div className="px-4 py-2" style={{ background: '#f0f2f5' }}>
          <p className="text-xs truncate" style={{ color: '#667781' }}>{message.text.length > 100 ? message.text.slice(0, 100) + '…' : message.text}</p>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#f0f2f5' }}>
            <Search size={14} style={{ color: '#54656f' }} />
            <input type="text" placeholder="Search contact..." value={q} onChange={e => setQ(e.target.value)} className="flex-1 bg-transparent text-sm focus:outline-none" style={{ color: '#111b21' }} />
          </div>
        </div>

        {error && <div className="px-4 py-1 text-xs text-center" style={{ color: '#e53e3e' }}>{error}</div>}

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map(t => {
            const label = t.name || t.mobile, isDone = done.includes(t.mobile);
            return (
              <div key={t.mobile} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition" style={{ borderBottom: '1px solid #f0f2f5' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0" style={{ background: getAvatarColor(label) }}>{getInitials(label)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#111b21' }}>{label}</p>
                  <p className="text-xs" style={{ color: '#667781' }}>{t.mobile}</p>
                </div>
                {isDone ? (
                  <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ background: '#d9fdd3', color: '#00a884' }}>Sent!</span>
                ) : (
                  <button onClick={() => handleForward(t.mobile)} disabled={!!sending}
                    className="p-2 rounded-full transition hover:bg-green-50 disabled:opacity-50" title="Forward">
                    {sending === t.mobile ? <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" /> : <Send size={16} style={{ color: '#00a884' }} />}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
