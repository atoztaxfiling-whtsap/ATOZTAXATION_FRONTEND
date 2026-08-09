import { useState, useEffect, useCallback } from 'react';
import { X, Pencil, Check, Loader2 } from 'lucide-react';
import { fetchContact, saveContactName, type Contact } from '../services/api';
import { getAvatarColor, getInitials } from './chatTypes';

interface Props { mobile: string; onClose: () => void; onNameSaved: () => void; isMobile?: boolean; }

function fmtNum(m: string) { const d = (m || '').replace(/\D/g, ''); const n = d.length > 10 ? d.slice(-10) : d; return n.length === 10 ? `+91 ${n.slice(0, 5)} ${n.slice(5)}` : m; }

function Chip({ text, tone }: { text: string; tone: 'green' | 'amber' | 'red' | 'muted' }) {
  const map = {
    green: { background: '#E7F2EC', color: '#0C5C40' },
    amber: { background: '#FBF1DC', color: '#9A6B12' },
    red: { background: '#F7E4E1', color: '#A6402F' },
    muted: { background: '#EEF0EC', color: '#5A6168' },
  } as const;
  return <span className="text-xs font-semibold px-2.5 py-1 rounded-md" style={map[tone]}>{text || '—'}</span>;
}

function wfTone(s: string): 'green' | 'amber' | 'red' | 'muted' {
  const t = (s || '').toLowerCase();
  if (['docs complete', 'completed', 'closed'].some(k => t.includes(k))) return 'green';
  if (t.includes('payment')) return 'amber';
  if (!t) return 'muted';
  return 'amber';
}
function payTone(s: string): 'green' | 'amber' | 'red' | 'muted' {
  const t = (s || '').toLowerCase();
  if (['complete', 'claimed', 'paid'].some(k => t.includes(k))) return 'green';
  if (['partial', 'waiting'].some(k => t.includes(k))) return 'amber';
  if (t.includes('pending')) return 'red';
  if (!t) return 'muted';
  return 'muted';
}

function DocList({ csv, received }: { csv: string; received: boolean }) {
  const items = (csv || '').split(',').map(s => s.trim()).filter(Boolean).filter(s => s.toLowerCase() !== 'all received');
  if (items.length === 0) return <p className="text-sm" style={{ color: '#5A6168' }}>{received ? 'None yet' : 'All received 🎉'}</p>;
  return (
    <div>
      {items.map((d, i) => (
        <div key={i} className="flex items-center gap-2.5 py-1 text-sm" style={{ color: '#15191E' }}>
          <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: received ? '#127A56' : '#e2e5df' }}>
            {received ? <Check size={12} className="text-white" strokeWidth={3} /> : <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#98a09a' }} />}
          </span>
          <span style={{ color: received ? '#15191E' : '#5A6168' }}>{d}</span>
        </div>
      ))}
    </div>
  );
}

export default function ContactPanel({ mobile, onClose, onNameSaved, isMobile }: Props) {
  const [c, setC] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const data = await fetchContact(mobile); setC(data); setNameVal(data?.name || ''); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }, [mobile]);

  useEffect(() => { setEditing(false); load(); }, [load]);

  const saveName = async () => {
    setSaving(true);
    try {
      const ok = await saveContactName(mobile, nameVal.trim());
      if (ok) { setC(prev => prev ? { ...prev, name: nameVal.trim() } : prev); setEditing(false); onNameSaved(); }
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const displayName = (c?.name || '').trim() || fmtNum(mobile);
  const label = (c?.name || '').trim() || mobile;

  return (
    <div className="flex flex-col flex-shrink-0" style={{ width: isMobile ? '100%' : 334, background: '#FBFBF9', borderLeft: '1px solid #E6E7E2' }}>
      <div className="flex items-center gap-3 px-4 py-4" style={{ background: '#fff', borderBottom: '1px solid #E6E7E2' }}>
        <h3 className="text-sm font-semibold" style={{ color: '#15191E' }}>Contact info</h3>
        <button onClick={onClose} className="ml-auto p-1 rounded-full hover:bg-gray-100"><X size={18} style={{ color: '#5A6168' }} /></button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* hero */}
        <div className="text-center px-4 pt-6 pb-5" style={{ background: '#fff', borderBottom: '1px solid #E6E7E2' }}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-white mx-auto mb-3" style={{ background: getAvatarColor(label), fontSize: 28, fontWeight: 600 }}>{getInitials(label)}</div>
          {!editing ? (
            <div className="flex items-center justify-center gap-2">
              <span className="serif font-semibold" style={{ fontSize: '1.3rem', color: '#15191E' }}>{displayName}</span>
              <button onClick={() => { setNameVal(c?.name || ''); setEditing(true); }} title="Edit name" className="p-1 rounded hover:bg-gray-100"><Pencil size={14} style={{ color: '#5A6168' }} /></button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 px-6">
              <input autoFocus value={nameVal} onChange={e => setNameVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveName()} placeholder="Client ka naam" className="flex-1 text-sm px-3 py-1.5 rounded-lg outline-none" style={{ background: '#F2F5F1', border: '1px solid #E6E7E2', color: '#15191E' }} />
              <button onClick={saveName} disabled={saving} className="p-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: '#127A56' }}>{saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}</button>
            </div>
          )}
          <div className="text-sm mt-1" style={{ color: '#5A6168' }}>{fmtNum(mobile)}</div>
          {c?.business ? <div className="text-sm mt-1.5 font-semibold" style={{ color: '#127A56' }}>{c.business}</div> : null}
        </div>

        {loading && <div className="flex items-center justify-center py-10"><Loader2 size={20} className="animate-spin" style={{ color: '#5A6168' }} /></div>}

        {!loading && c && (
          <div style={{ padding: 12 }}>
            {/* service */}
            <div className="mb-3 rounded-xl p-4" style={{ background: '#fff', border: '1px solid #E6E7E2' }}>
              <h4 className="text-[11px] font-semibold uppercase mb-3" style={{ letterSpacing: '.14em', color: '#5A6168' }}>Service</h4>
              <div className="flex justify-between items-center text-sm mb-2"><span style={{ color: '#5A6168' }}>Service</span><span className="font-semibold" style={{ color: '#15191E' }}>{c.service || '—'}</span></div>
              {c.fee ? <div className="flex justify-between items-center text-sm mb-2"><span style={{ color: '#5A6168' }}>Fee</span><span className="font-semibold" style={{ color: '#15191E' }}>{c.fee}</span></div> : null}
              <div className="flex justify-between items-center text-sm"><span style={{ color: '#5A6168' }}>Status</span><Chip text={c.workflow?.status || 'New'} tone={wfTone(c.workflow?.status)} /></div>
            </div>

            {/* documents */}
            {(c.workflow?.docs_received || c.workflow?.docs_pending) ? (
              <div className="mb-3 rounded-xl p-4" style={{ background: '#fff', border: '1px solid #E6E7E2' }}>
                <h4 className="text-[11px] font-semibold uppercase mb-3" style={{ letterSpacing: '.14em', color: '#5A6168' }}>Documents</h4>
                <DocList csv={c.workflow?.docs_received} received={true} />
                {c.workflow?.docs_pending && c.workflow.docs_pending.toLowerCase() !== 'all received' ? <div className="mt-1"><DocList csv={c.workflow?.docs_pending} received={false} /></div> : null}
              </div>
            ) : null}

            {/* payment */}
            {(c.payment?.status || c.payment?.due) ? (
              <div className="mb-3 rounded-xl p-4" style={{ background: '#fff', border: '1px solid #E6E7E2' }}>
                <h4 className="text-[11px] font-semibold uppercase mb-3" style={{ letterSpacing: '.14em', color: '#5A6168' }}>Payment</h4>
                <div className="flex justify-between items-center text-sm mb-2"><span style={{ color: '#5A6168' }}>Status</span><Chip text={c.payment?.status || '—'} tone={payTone(c.payment?.status)} /></div>
                {c.payment?.due ? <div className="flex justify-between items-center text-sm"><span style={{ color: '#5A6168' }}>Amount due</span><span className="font-semibold" style={{ color: '#15191E' }}>₹{c.payment.due}</span></div> : null}
              </div>
            ) : null}

            {/* notes */}
            {c.workflow?.notes ? (
              <div className="mb-3 rounded-xl p-4" style={{ background: '#fff', border: '1px solid #E6E7E2' }}>
                <h4 className="text-[11px] font-semibold uppercase mb-3" style={{ letterSpacing: '.14em', color: '#5A6168' }}>Office notes</h4>
                <div className="rounded-lg p-3 text-sm" style={{ background: '#F2F5F1', border: '1px solid #E6E7E2', color: '#2C333B', lineHeight: 1.5 }}>{c.workflow.notes}</div>
              </div>
            ) : null}

            {!c.service && !c.workflow?.docs_received && !c.payment?.status ? (
              <p className="text-sm text-center py-4" style={{ color: '#5A6168' }}>Is client ka koi active service record nahi mila.</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
