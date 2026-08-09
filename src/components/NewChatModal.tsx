import { useState, useEffect } from 'react';
import { ArrowLeft, Search, Loader2, Hash } from 'lucide-react';
import { fetchClients, type Client } from '../services/api';
import { getAvatarColor, getInitials } from './chatTypes';

interface Props { onClose: () => void; onPick: (mobile: string) => void; }

function norm(m: string) { return (m || '').replace(/\D/g, '').slice(-10); }

export default function NewChatModal({ onClose, onPick }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    let live = true;
    (async () => { try { const d = await fetchClients(); if (live) setClients(d); } catch { /* ignore */ } finally { if (live) setLoading(false); } })();
    return () => { live = false; };
  }, []);

  const ql = q.trim().toLowerCase();
  const digits = q.replace(/\D/g, '');
  const filtered = clients.filter(c => {
    const name = (c.name || '').toLowerCase();
    return !ql || name.includes(ql) || (c.mobile || '').includes(digits && digits.length ? digits : ql);
  });
  const canUseNumber = digits.length >= 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(21,25,30,0.42)' }} onClick={onClose}>
      <div className="w-full max-w-md mx-4 bg-white rounded-2xl overflow-hidden flex flex-col" style={{ maxHeight: '80vh' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: '1px solid #E6E7E2' }}>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100"><ArrowLeft size={18} style={{ color: '#2C333B' }} /></button>
          <h3 className="serif font-semibold" style={{ fontSize: '1.15rem', color: '#15191E' }}>New chat</h3>
        </div>

        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg" style={{ background: '#F2F5F1', border: '1px solid #E6E7E2' }}>
            <Search size={16} style={{ color: '#5A6168' }} />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or type a number…" className="flex-1 bg-transparent text-sm outline-none" style={{ color: '#15191E' }} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {canUseNumber && (
            <div onClick={() => onPick(norm(digits))} className="flex items-center gap-3 px-4 py-3 cursor-pointer" style={{ borderBottom: '1px solid #f2f3ef' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ background: '#127A56' }}><Hash size={18} /></div>
              <div><div className="text-sm font-semibold" style={{ color: '#15191E' }}>Start chat with +91 {digits.slice(-10)}</div><div className="text-xs" style={{ color: '#5A6168' }}>New number</div></div>
            </div>
          )}

          {loading && <div className="flex items-center justify-center py-10"><Loader2 size={20} className="animate-spin" style={{ color: '#5A6168' }} /></div>}

          {!loading && filtered.length === 0 && !canUseNumber && (
            <div className="text-center text-sm py-8" style={{ color: '#5A6168' }}>Koi client nahi mila. Pura number type karo naya chat shuru karne ke liye.</div>
          )}

          {!loading && filtered.map((c, i) => {
            const label = c.name || c.mobile;
            return (
              <div key={i} onClick={() => onPick(norm(c.mobile))} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#FAFBF8]" style={{ borderBottom: '1px solid #f2f3ef' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0" style={{ background: getAvatarColor(label) }}>{getInitials(label)}</div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: '#15191E' }}>{c.name || `+91 ${c.mobile}`}</div>
                  <div className="text-xs truncate" style={{ color: '#5A6168' }}>{[c.service || c.sheet, c.mobile ? `+91 ${c.mobile}` : ''].filter(Boolean).join(' · ')}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-4 py-3" style={{ background: '#FBF6E7', color: '#8A6D1A', fontSize: 11.5, lineHeight: 1.45, borderTop: '1px solid #EFE4C4' }}>
          Note: Client ne 24 ghante me message nahi kiya to sirf approved template jaa sakta hai (WhatsApp rule).
        </div>
      </div>
    </div>
  );
}
