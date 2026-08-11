import { useState } from 'react';
import { Reply, Check, CheckCheck, Download, Eye, X, Play, Share2, Flag, AlertCircle } from 'lucide-react';
import type { FlatMessage } from './chatTypes';

interface Props { message: FlatMessage; onReply: (m: FlatMessage) => void; onForward: (m: FlatMessage) => void; onFlag?: (m: FlatMessage) => void; allMessages: FlatMessage[]; }

function fmtTime(ts: string): string { try { const d = new Date(ts); return isNaN(d.getTime()) ? ts : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return ts; } }

const IMG = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;
const PDF = /\.pdf(\?.*)?$/i;
const AUD = /\.(mp3|ogg|wav|webm|m4a|aac|opus)(\?.*)?$/i;
const VID = /\.(mp4|mov|avi|mkv|3gp)(\?.*)?$/i;
const DOC = /\.(doc|docx|xls|xlsx|txt|csv|zip|rar|ppt|pptx)(\?.*)?$/i;
const MEDIA_IN = /^\[MEDIA_IN\]/i;
const URL_RE = /^https?:\/\//i;
const LINK_RE = /(https?:\/\/[^\s]+)/g;

type FT = 'image'|'pdf'|'audio'|'video'|'doc'|'media_in'|'url'|'text';
function ft(t: string): FT { const s = t.trim(); if (MEDIA_IN.test(s)) return 'media_in'; if (IMG.test(s)) return 'image'; if (PDF.test(s)) return 'pdf'; if (AUD.test(s)) return 'audio'; if (VID.test(s)) return 'video'; if (DOC.test(s)) return 'doc'; if (URL_RE.test(s) && !s.includes(' ')) return 'url'; return 'text'; }
function fname(u: string): string { try { return decodeURIComponent(u.split('/').pop()?.split('?')[0] || 'file'); } catch { return 'file'; } }
function ext(n: string): string { return n.split('.').pop()?.toLowerCase() || ''; }

const EC: Record<string, string> = { pdf: '#e53e3e', doc: '#2b579a', docx: '#2b579a', xls: '#217346', xlsx: '#217346', ppt: '#d24625', pptx: '#d24625', txt: '#6b7280', csv: '#6b7280', zip: '#f59e0b', rar: '#f59e0b' };

async function dl(url: string, name: string) { try { const r = await fetch(url); const b = await r.blob(); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u); } catch { window.open(url, '_blank'); } }

function Tick({ status }: { status?: 'sent'|'delivered'|'read'|'failed' }) {
  if (!status) return null;
  if (status === 'failed') return <AlertCircle size={14} style={{ color: '#c53030' }} className="inline ml-0.5 -mb-0.5" />;
  if (status === 'sent') return <Check size={14} style={{ color: '#5A6168' }} className="inline ml-0.5 -mb-0.5" />;
  if (status === 'delivered') return <CheckCheck size={14} style={{ color: '#5A6168' }} className="inline ml-0.5 -mb-0.5" />;
  return <CheckCheck size={14} style={{ color: '#127A56' }} className="inline ml-0.5 -mb-0.5" />;
}

function Viewer({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: 'rgba(0,0,0,0.9)' }} onClick={onClose}>
      <div className="absolute top-4 right-4 flex gap-2 z-50">
        <button onClick={e => { e.stopPropagation(); dl(src, fname(src)); }} className="p-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}><Download size={20} className="text-white" /></button>
        <button onClick={onClose} className="p-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}><X size={20} className="text-white" /></button>
      </div>
      <img src={src} alt="" className="max-w-[95vw] max-h-[85vh] object-contain rounded-lg" onClick={e => e.stopPropagation()} />
    </div>
  );
}

export default function MessageBubble({ message, onReply, onForward, onFlag, allMessages }: Props) {
  const [hov, setHov] = useState(false);
  const [fullImg, setFullImg] = useState<string | null>(null);
  const [showPdf, setShowPdf] = useState(false);
  const isSent = message.sender === 'me';
  const time = fmtTime(message.timestamp);
  const type = ft(message.text);
  const replyMsg = message.replyToId ? allMessages.find(m => m.id === message.replyToId) : null;

  const content = () => {
    const text = message.text;
    switch (type) {
      case 'media_in': return (<div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: isSent ? 'rgba(0,0,0,0.06)' : '#F2F5F1' }}><span className="text-lg">📎</span><div><p className="text-sm font-medium" style={{ color: '#15191E' }}>Media received</p><p className="text-xs" style={{ color: '#5A6168' }}>{text.replace(MEDIA_IN, '').trim() || 'Attachment'}</p></div></div>);
      case 'image': return (<div className="mb-1"><img src={text} alt="" className="rounded-lg max-w-full max-h-56 object-cover cursor-pointer hover:opacity-90 transition" loading="lazy" onClick={() => setFullImg(text)} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /><div className="flex gap-1 mt-1"><button onClick={() => setFullImg(text)} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded hover:bg-black/5" style={{ color: '#127A56' }}><Eye size={12} /> View</button><button onClick={() => dl(text, fname(text))} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded hover:bg-black/5" style={{ color: '#5A6168' }}><Download size={12} /> Save</button></div></div>);
      case 'pdf': { const n = fname(text); return (<div className="mb-1">{showPdf ? (<div className="rounded-lg overflow-hidden border" style={{ borderColor: '#E6E7E2' }}><div className="flex items-center justify-between px-3 py-1.5" style={{ background: '#F2F5F1' }}><span className="text-xs font-medium truncate" style={{ color: '#15191E' }}>{n}</span><button onClick={() => setShowPdf(false)} className="p-1 rounded hover:bg-gray-200"><X size={14} style={{ color: '#5A6168' }} /></button></div><iframe src={text} className="w-full border-0" style={{ height: '280px' }} title="PDF" /></div>) : (<div className="flex items-center gap-3 p-3 rounded-lg cursor-pointer" onClick={() => setShowPdf(true)} style={{ background: isSent ? 'rgba(0,0,0,0.06)' : '#F2F5F1' }}><div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: '#e53e3e' }}>PDF</div><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate" style={{ color: '#15191E' }}>{n}</p><p className="text-xs" style={{ color: '#5A6168' }}>Tap to preview</p></div><Eye size={16} style={{ color: '#127A56' }} /></div>)}<div className="flex gap-1 mt-1"><button onClick={() => setShowPdf(!showPdf)} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded hover:bg-black/5" style={{ color: '#127A56' }}><Eye size={12} /> {showPdf ? 'Close' : 'Preview'}</button><button onClick={() => dl(text, n)} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded hover:bg-black/5" style={{ color: '#5A6168' }}><Download size={12} /> Save</button></div></div>); }
      case 'audio': return (<div className="mb-1"><div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: isSent ? 'rgba(0,0,0,0.06)' : '#F2F5F1' }}><div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#127A56' }}><Play size={14} className="text-white" fill="white" /></div><audio controls src={text} className="flex-1 h-8" preload="metadata" /></div><button onClick={() => dl(text, fname(text))} className="flex items-center gap-1 text-xs px-2 py-0.5 mt-1 rounded hover:bg-black/5" style={{ color: '#5A6168' }}><Download size={12} /> Save</button></div>);
      case 'video': return (<div className="mb-1"><video controls src={text} className="rounded-lg max-w-full max-h-56" preload="metadata" /><button onClick={() => dl(text, fname(text))} className="flex items-center gap-1 text-xs px-2 py-0.5 mt-1 rounded hover:bg-black/5" style={{ color: '#5A6168' }}><Download size={12} /> Save</button></div>);
      case 'doc': { const n = fname(text), e = ext(n); return (<div className="flex items-center gap-3 p-3 rounded-lg cursor-pointer" onClick={() => dl(text, n)} style={{ background: isSent ? 'rgba(0,0,0,0.06)' : '#F2F5F1' }}><div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: EC[e] || '#127A56' }}>{e.toUpperCase().slice(0, 4)}</div><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate" style={{ color: '#15191E' }}>{n}</p><p className="text-xs" style={{ color: '#5A6168' }}>Tap to download</p></div><Download size={16} style={{ color: '#5A6168' }} /></div>); }
      case 'url': return (<a href={text} target="_blank" rel="noopener noreferrer" className="text-sm break-all underline" style={{ color: '#027eb5' }}>{text}</a>);
      default: { const parts = text.split(LINK_RE); if (parts.length > 1) return (<p className="text-sm break-words whitespace-pre-wrap" style={{ color: '#15191E' }}>{parts.map((p, i) => LINK_RE.test(p) ? <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#027eb5' }}>{p}</a> : <span key={i}>{p}</span>)}</p>); return <p className="text-sm break-words whitespace-pre-wrap" style={{ color: '#15191E' }}>{text}</p>; }
    }
  };

  return (
    <>
      {fullImg && <Viewer src={fullImg} onClose={() => setFullImg(null)} />}
      <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} px-2 py-0.5`} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
        <div className={`flex items-end gap-1 max-w-[75%] ${isSent ? 'flex-row-reverse' : 'flex-row'}`}>
          <div className="transition-opacity flex-shrink-0 self-center flex gap-0.5" style={{ opacity: hov ? 1 : 0 }}>
            <button onClick={() => onReply(message)} className="p-1 rounded-full hover:bg-gray-200 transition" title="Reply"><Reply size={13} style={{ color: '#5A6168' }} /></button>
            <button onClick={() => onForward(message)} className="p-1 rounded-full hover:bg-gray-200 transition" title="Forward"><Share2 size={13} style={{ color: '#5A6168' }} /></button>
            {message.isBot && onFlag && (
              <button onClick={() => onFlag(message)} className="p-1 rounded-full hover:bg-red-100 transition" title="Bot ne galat bola"><Flag size={13} style={{ color: '#c53030' }} /></button>
            )}
          </div>
          <div className="relative px-3 py-2 shadow-sm" style={{ background: isSent ? '#E7F2EC' : '#fff', borderRadius: isSent ? '12px 12px 0 12px' : '0 12px 12px 12px', minWidth: '72px', maxWidth: '100%' }}>
            {replyMsg && (<div className="mb-2 px-2 py-1.5 rounded-lg border-l-4" style={{ background: isSent ? 'rgba(0,0,0,0.05)' : '#F2F5F1', borderLeftColor: '#127A56' }}><p className="text-xs font-semibold mb-0.5" style={{ color: '#127A56' }}>{replyMsg.sender === 'me' ? 'You' : 'Contact'}</p><p className="text-xs truncate" style={{ color: '#5A6168' }}>{replyMsg.text.length > 60 ? replyMsg.text.slice(0, 60) + '…' : replyMsg.text}</p></div>)}
            {content()}
            <div className="flex items-center justify-end gap-0.5 mt-1" style={{ minHeight: '16px' }}><span style={{ color: '#5A6168', fontSize: '11px' }}>{time}</span><Tick status={message.status} /></div>
            {message.status === 'failed' && <div className="text-[11px] mt-0.5" style={{ color: '#c53030' }}>❗ Ye message client tak nahi pahuncha{message.statusError ? ` (${message.statusError})` : ''}</div>}
          </div>
        </div>
      </div>
    </>
  );
}
