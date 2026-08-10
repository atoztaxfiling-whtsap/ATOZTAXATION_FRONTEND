import { useState, useEffect } from 'react';
import { X, Loader2, Send, AlertTriangle } from 'lucide-react';
import { fetchTemplates, sendTemplate, type Template } from '../services/api';

interface Props { mobile: string; onClose: () => void; onSent: () => void; }

export default function TemplatePicker({ mobile, onClose, onSent }: Props) {
  const [items, setItems] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let live = true;
    (async () => {
      try { const d = await fetchTemplates(); if (live) setItems(d); }
      catch { if (live) setErr('Templates load nahi hue'); }
      finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, []);

  const send = async (t: Template) => {
    setSending(t.sid); setErr('');
    try {
      const ok = await sendTemplate(mobile, t.sid, t.preview || t.name);
      if (ok) { onSent(); onClose(); } else setErr('Template nahi gaya');
    } catch (e) { setErr((e as Error).message || 'Template nahi gaya'); }
    finally { setSending(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(21,25,30,0.45)' }} onClick={onClose}>
      <div className="w-full max-w-md mx-4 bg-white rounded-2xl overflow-hidden flex flex-col" style={{ maxHeight: '80vh' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: '1px solid #E6E7E2' }}>
          <h3 className="serif font-semibold flex-1" style={{ fontSize: '1.12rem', color: '#15191E' }}>Approved template bhejo</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100"><X size={18} style={{ color: '#5A6168' }} /></button>
        </div>

        <div className="flex items-start gap-2 px-4 py-3" style={{ background: '#FBF6E7', color: '#8A6D1A', fontSize: 12.5, lineHeight: 1.5 }}>
          <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
          <span>24 ghante ka window band hai. Ab sirf pehle se approved template hi ja sakta hai. Client reply karega to phir normal message bhej sakte ho.</span>
        </div>

        {err && <div className="px-4 py-2 text-xs" style={{ color: '#c53030' }}>{err}</div>}

        <div className="flex-1 overflow-y-auto">
          {loading && <div className="flex items-center justify-center py-10"><Loader2 size={20} className="animate-spin" style={{ color: '#5A6168' }} /></div>}

          {!loading && items.length === 0 && (
            <div className="px-5 py-8 text-sm text-center" style={{ color: '#5A6168' }}>
              Koi template nahi mila.<br />
              <span className="text-xs">Google Sheet me <b>Templates</b> tab me Name + Content SID daalo (Twilio se approved template ka SID).</span>
            </div>
          )}

          {!loading && items.map(t => (
            <div key={t.sid} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid #f2f3ef' }}>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold" style={{ color: '#15191E' }}>{t.name}</div>
                {t.preview ? <div className="text-xs mt-0.5 truncate" style={{ color: '#5A6168' }}>{t.preview}</div> : null}
              </div>
              <button onClick={() => send(t)} disabled={!!sending}
                className="p-2 rounded-lg text-white disabled:opacity-50 flex-shrink-0" style={{ background: '#127A56' }} title="Bhejo">
                {sending === t.sid ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
