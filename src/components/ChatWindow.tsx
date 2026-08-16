import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MoreVertical, Phone, Video, ArrowLeft, ChevronDown, X, Bot, PowerOff } from 'lucide-react';
import type { Thread, FlatMessage } from './chatTypes';
import { getAvatarColor, getInitials } from './chatTypes';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import ForwardModal from './ForwardModal';
import ContactPanel from './ContactPanel';
import TemplatePicker from './TemplatePicker';
import ChatSummaryBar from './ChatSummaryBar';
import { fetchBotPause, setBotPause, flagBotReply } from '../services/api';

interface Props { selectedMobile: string | null; threads: Thread[]; messages: FlatMessage[]; messagesLoading: boolean; isMobile: boolean; onBack: () => void; onSendMessage: (t: string, r?: FlatMessage) => Promise<void>; onSendDocument: (f: File) => Promise<void>; onContactChanged?: () => void; }

const WALLPAPER = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%23F2F5F1'/%3E%3Cpath d='M0 40 L40 0 L80 40 L40 80 Z' stroke='%23d6cfc6' stroke-width='0.4' fill='none' opacity='0.5'/%3E%3C/svg%3E")`;

function dateSep(ts: string): string { try { const d = new Date(ts); if (isNaN(d.getTime())) return ts; const n = new Date(), t = new Date(n.getFullYear(), n.getMonth(), n.getDate()), y = new Date(t.getTime() - 86400000), m = new Date(d.getFullYear(), d.getMonth(), d.getDate()); if (m.getTime() === t.getTime()) return 'TODAY'; if (m.getTime() === y.getTime()) return 'YESTERDAY'; return d.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }); } catch { return ts; } }
function sameDay(a: string, b: string): boolean { try { return new Date(a).toDateString() === new Date(b).toDateString(); } catch { return false; } }

export default function ChatWindow({ selectedMobile, threads, messages, messagesLoading, isMobile, onBack, onSendMessage, onSendDocument, onContactChanged }: Props) {
  const [replyTo, setReplyTo] = useState<FlatMessage | null>(null);
  const [sending, setSending] = useState(false);
  const [showScroll, setShowScroll] = useState(false);
  const [sendErr, setSendErr] = useState<string | null>(null);
  const [fwdMsg, setFwdMsg] = useState<FlatMessage | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [srch, setSrch] = useState<string | null>(null);
  const [botPaused, setBotPausedState] = useState(false);
  const [pausedUntil, setPausedUntil] = useState('');
  const [pauseBusy, setPauseBusy] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(0);
  const thread: Thread | undefined = threads.find(t => t.mobile === selectedMobile) || (selectedMobile ? { mobile: selectedMobile } : undefined);

  const scrollBottom = useCallback((smooth = true) => { endRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' }); }, []);

  useEffect(() => { if (messages.length > prevCount.current) { const el = scrollRef.current; const near = el ? el.scrollHeight - el.scrollTop - el.clientHeight < 200 : true; if (near || messages.length - prevCount.current === messages.length) scrollBottom(messages.length - prevCount.current < 5); } prevCount.current = messages.length; }, [messages, scrollBottom]);
  useEffect(() => { setReplyTo(null); setShowScroll(false); setSendErr(null); setShowInfo(false); setSrch(null); setShowTemplates(false); setToast(null); prevCount.current = 0; }, [selectedMobile]);
  useEffect(() => {
    if (!selectedMobile) { setBotPausedState(false); return; }
    let live = true;
    fetchBotPause(selectedMobile).then(p => { if (live) { setBotPausedState(!!p.paused); setPausedUntil(p.until || ''); } }).catch(() => {});
    return () => { live = false; };
  }, [selectedMobile]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 5000); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { if (!sendErr) return; const t = setTimeout(() => setSendErr(null), 4000); return () => clearTimeout(t); }, [sendErr]);

  const afterStaffSend = () => { setBotPausedState(true); scrollBottom(); };

  const handleSendErr = (e: unknown, fallback: string) => {
    const err = e as Error & { windowClosed?: boolean };
    if (err?.windowClosed) { setShowTemplates(true); setSendErr(err.message || '24 ghante ka window band hai'); }
    else setSendErr(err?.message || fallback);
  };

  const handleSend = async (text: string, reply?: FlatMessage) => {
    setSending(true); setSendErr(null);
    try { await onSendMessage(text, reply); afterStaffSend(); }
    catch (e) { handleSendErr(e, 'Message bhejne me error. Retry karo.'); }
    finally { setSending(false); }
  };

  const handleDoc = async (file: File) => {
    setSending(true); setSendErr(null);
    try { await onSendDocument(file); afterStaffSend(); }
    catch (e) { handleSendErr(e, 'File bhejne me error. Retry karo.'); }
    finally { setSending(false); }
  };

  const toggleBot = async () => {
    if (!selectedMobile || pauseBusy) return;
    setPauseBusy(true);
    try { const r = await setBotPause(selectedMobile, !botPaused); setBotPausedState(!!r.paused); setPausedUntil(r.until || ''); }
    catch { setToast('Nahi ho paya, dubara try karo'); }
    finally { setPauseBusy(false); }
  };

  const handleFlag = async (m: FlatMessage) => {
    if (!selectedMobile) return;
    try { await flagBotReply(selectedMobile, m.text); setToast('Flag ho gaya, main isko dekh lunga'); }
    catch { setToast('Flag nahi hua'); }
  };

  const handleCall = () => { if (!selectedMobile) return; let n = selectedMobile.replace(/\D/g, ''); if (n.length === 10) n = '+91' + n; else if (!n.startsWith('+')) n = '+' + n; window.open(`tel:${n}`, '_self'); };

  if (!selectedMobile || !thread) {
    if (isMobile) return null;
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-4 select-none" style={{ background: '#F2F5F1' }}>
        <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: '#E7F2EC' }}><span className="text-5xl">💬</span></div>
        <h2 className="serif text-2xl" style={{ color: '#15191E' }}>ATOZ Taxation</h2>
        <p className="text-sm text-center max-w-xs" style={{ color: '#5A6168' }}>Console — select a chat to start messaging</p>
      </div>
    );
  }

  const label = thread.name || thread.mobile, ini = getInitials(label), col = getAvatarColor(label);
  const q = (srch || '').trim().toLowerCase();
  const shown = q ? messages.filter(m => (m.text || '').toLowerCase().includes(q)) : messages;

  const chatCol = (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0 shadow-sm" style={{ background: '#0F6E56' }}>
        {isMobile && <button onClick={onBack} className="p-1.5 rounded-full hover:bg-white/20 transition"><ArrowLeft size={20} className="text-white" /></button>}
        <div onClick={() => setShowInfo(v => !v)} className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 cursor-pointer" style={{ background: col }}>{ini}</div>
        <div onClick={() => setShowInfo(v => !v)} className="flex-1 min-w-0 cursor-pointer"><h2 className="serif text-white font-semibold text-base truncate">{label}</h2><p className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>{thread.mobile}</p></div>
        <div className="flex items-center gap-1">
          <button onClick={handleCall} className="p-2 rounded-full hover:bg-white/20 transition" title="Call"><Phone size={20} className="text-white" /></button>
          <button className="p-2 rounded-full hover:bg-white/20 transition opacity-40 cursor-not-allowed" title="Video (not available)"><Video size={20} className="text-white" /></button>
          <button onClick={() => setSrch(s => (s === null ? '' : null))} className="p-2 rounded-full hover:bg-white/20 transition" title="Search in chat"><Search size={20} className="text-white" /></button>
          <button onClick={toggleBot} disabled={pauseBusy} className="p-2 rounded-full hover:bg-white/20 transition disabled:opacity-50" title={botPaused ? 'Bot band hai — chalu karo' : 'Bot chalu hai — band karo'}>
            {botPaused ? <PowerOff size={20} className="text-white" /> : <Bot size={20} className="text-white" />}
          </button>
          <button className="p-2 rounded-full hover:bg-white/20 transition"><MoreVertical size={20} className="text-white" /></button>
        </div>
      </div>

      <ChatSummaryBar mobile={thread.mobile} />

      {srch !== null && (
        <div className="flex items-center gap-2 px-4 py-2" style={{ background: '#FBFBF9', borderBottom: '1px solid #E6E7E2' }}>
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#fff', border: '1px solid #E6E7E2' }}>
            <Search size={15} style={{ color: '#5A6168' }} />
            <input autoFocus value={srch} onChange={e => setSrch(e.target.value)} placeholder="Search in this chat…" className="flex-1 bg-transparent text-sm outline-none" style={{ color: '#15191E' }} />
          </div>
          {q && <span className="text-xs whitespace-nowrap" style={{ color: '#5A6168' }}>{shown.length} match</span>}
          <button onClick={() => setSrch(null)} className="p-1 rounded hover:bg-gray-100"><X size={17} style={{ color: '#5A6168' }} /></button>
        </div>
      )}

      {botPaused && (
        <div className="flex items-center gap-2 px-4 py-2 text-sm" style={{ background: '#FBF6E7', color: '#8A6D1A', borderBottom: '1px solid #EFE4C4' }}>
          <PowerOff size={15} className="flex-shrink-0" />
          <span className="flex-1">Bot is chat me chup hai, aap khud handle kar rahe ho{pausedUntil ? ` (${pausedUntil.slice(11, 16)} tak)` : ''}.</span>
          <button onClick={toggleBot} disabled={pauseBusy} className="font-semibold underline disabled:opacity-50" style={{ color: '#0C5C40' }}>Bot chalu karo</button>
        </div>
      )}

      {toast && <div className="px-4 py-2 text-sm text-center" style={{ background: '#E7F2EC', color: '#0C5C40', borderBottom: '1px solid #d3e6dc' }}>{toast}</div>}

      {sendErr && <div className="px-4 py-2 text-sm font-medium text-center" style={{ background: '#fef2f2', color: '#dc2626', borderBottom: '1px solid #fecaca' }}>{sendErr}</div>}

      <div className="flex-1 relative overflow-hidden">
        <div ref={scrollRef} onScroll={() => { const el = scrollRef.current; if (el) setShowScroll(el.scrollHeight - el.scrollTop - el.clientHeight > 120); }}
          className="h-full overflow-y-auto py-4" style={{ backgroundColor: '#F2F5F1', backgroundImage: WALLPAPER, backgroundSize: '80px 80px' }}>
          {messagesLoading && messages.length === 0 && <div className="flex items-center justify-center py-8"><div className="px-4 py-2 rounded-full text-sm shadow-sm" style={{ background: '#fff', color: '#5A6168' }}>Loading messages…</div></div>}
          {q && shown.length === 0 && <div className="flex items-center justify-center py-8"><div className="px-4 py-2 rounded-full text-sm shadow-sm" style={{ background: '#fff', color: '#5A6168' }}>Koi match nahi mila</div></div>}
          <div className="pb-2">
            {shown.map((msg, idx) => {
              const prev = idx > 0 ? shown[idx - 1] : null;
              const showDate = !prev || !sameDay(prev.timestamp, msg.timestamp);
              return (
                <React.Fragment key={msg.id}>
                  {showDate && <div className="flex items-center justify-center my-3 px-4"><span className="px-3 py-1 rounded-full text-xs shadow-sm" style={{ background: '#EEF1EA', color: '#5A6168' }}>{dateSep(msg.timestamp)}</span></div>}
                  <MessageBubble message={msg} onReply={setReplyTo} onForward={setFwdMsg} onFlag={handleFlag} allMessages={messages} />
                </React.Fragment>
              );
            })}
          </div>
          <div ref={endRef} />
        </div>
        {showScroll && <button onClick={() => scrollBottom()} className="absolute bottom-4 right-4 w-10 h-10 rounded-full shadow-lg flex items-center justify-center z-10" style={{ background: '#fff' }}><ChevronDown size={20} style={{ color: '#5A6168' }} /></button>}
      </div>

      <ChatInput onSendMessage={handleSend} onSendDocument={handleDoc} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} disabled={sending} />

      {fwdMsg && <ForwardModal message={fwdMsg} threads={threads} onClose={() => setFwdMsg(null)} />}
      {showTemplates && selectedMobile && (
        <TemplatePicker mobile={selectedMobile} onClose={() => setShowTemplates(false)} onSent={() => { setSendErr(null); setToast('Template bhej diya'); afterStaffSend(); }} />
      )}
    </div>
  );

  return (
    <div className="flex-1 flex min-w-0 overflow-hidden">
      {!(isMobile && showInfo) && chatCol}
      {showInfo && selectedMobile && (
        <ContactPanel mobile={selectedMobile} isMobile={isMobile} onClose={() => setShowInfo(false)} onNameSaved={() => onContactChanged && onContactChanged()} />
      )}
    </div>
  );
}
