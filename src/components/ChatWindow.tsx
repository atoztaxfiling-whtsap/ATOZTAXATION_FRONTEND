import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MoreVertical, Phone, Video, ArrowLeft, ChevronDown } from 'lucide-react';
import type { Thread, FlatMessage } from './chatTypes';
import { getAvatarColor, getInitials } from './chatTypes';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import ForwardModal from './ForwardModal';

interface Props { selectedMobile: string | null; threads: Thread[]; messages: FlatMessage[]; messagesLoading: boolean; isMobile: boolean; onBack: () => void; onSendMessage: (t: string, r?: FlatMessage) => Promise<void>; onSendDocument: (f: File) => Promise<void>; }

const WALLPAPER = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%23efeae2'/%3E%3Cpath d='M0 40 L40 0 L80 40 L40 80 Z' stroke='%23d6cfc6' stroke-width='0.4' fill='none' opacity='0.5'/%3E%3C/svg%3E")`;

function dateSep(ts: string): string { try { const d = new Date(ts); if (isNaN(d.getTime())) return ts; const n = new Date(), t = new Date(n.getFullYear(), n.getMonth(), n.getDate()), y = new Date(t.getTime() - 86400000), m = new Date(d.getFullYear(), d.getMonth(), d.getDate()); if (m.getTime() === t.getTime()) return 'TODAY'; if (m.getTime() === y.getTime()) return 'YESTERDAY'; return d.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }); } catch { return ts; } }
function sameDay(a: string, b: string): boolean { try { return new Date(a).toDateString() === new Date(b).toDateString(); } catch { return false; } }

export default function ChatWindow({ selectedMobile, threads, messages, messagesLoading, isMobile, onBack, onSendMessage, onSendDocument }: Props) {
  const [replyTo, setReplyTo] = useState<FlatMessage | null>(null);
  const [sending, setSending] = useState(false);
  const [showScroll, setShowScroll] = useState(false);
  const [sendErr, setSendErr] = useState<string | null>(null);
  const [fwdMsg, setFwdMsg] = useState<FlatMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(0);
  const thread = threads.find(t => t.mobile === selectedMobile);

  const scrollBottom = useCallback((smooth = true) => { endRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' }); }, []);

  useEffect(() => { if (messages.length > prevCount.current) { const el = scrollRef.current; const near = el ? el.scrollHeight - el.scrollTop - el.clientHeight < 200 : true; if (near || messages.length - prevCount.current === messages.length) scrollBottom(messages.length - prevCount.current < 5); } prevCount.current = messages.length; }, [messages, scrollBottom]);
  useEffect(() => { setReplyTo(null); setShowScroll(false); setSendErr(null); prevCount.current = 0; }, [selectedMobile]);
  useEffect(() => { if (!sendErr) return; const t = setTimeout(() => setSendErr(null), 4000); return () => clearTimeout(t); }, [sendErr]);

  const handleSend = async (text: string, reply?: FlatMessage) => { setSending(true); setSendErr(null); try { await onSendMessage(text, reply); scrollBottom(); } catch { setSendErr('Message bhejne me error. Retry karo.'); } finally { setSending(false); } };
  const handleDoc = async (file: File) => { setSending(true); setSendErr(null); try { await onSendDocument(file); scrollBottom(); } catch { setSendErr('File bhejne me error. Retry karo.'); } finally { setSending(false); } };

  const handleCall = () => { if (!selectedMobile) return; let n = selectedMobile.replace(/\D/g, ''); if (n.length === 10) n = '+91' + n; else if (!n.startsWith('+')) n = '+' + n; window.open(`tel:${n}`, '_self'); };

  if (!selectedMobile || !thread) {
    if (isMobile) return null;
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-4 select-none" style={{ background: '#f0f2f5' }}>
        <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: '#d9fdd3' }}><span className="text-5xl">💬</span></div>
        <h2 className="text-2xl font-light" style={{ color: '#111b21' }}>ATOZ Taxation</h2>
        <p className="text-sm text-center max-w-xs" style={{ color: '#667781' }}>WhatsApp Business Console<br />Select a chat to start messaging</p>
      </div>
    );
  }

  const label = thread.name || thread.mobile, ini = getInitials(label), col = getAvatarColor(label);

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0 shadow-sm" style={{ background: '#00a884' }}>
        {isMobile && <button onClick={onBack} className="p-1.5 rounded-full hover:bg-white/20 transition"><ArrowLeft size={20} className="text-white" /></button>}
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0" style={{ background: col }}>{ini}</div>
        <div className="flex-1 min-w-0"><h2 className="text-white font-semibold text-sm truncate">{label}</h2><p className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>{thread.mobile}</p></div>
        <div className="flex items-center gap-1">
          <button onClick={handleCall} className="p-2 rounded-full hover:bg-white/20 transition" title="Call"><Phone size={20} className="text-white" /></button>
          <button className="p-2 rounded-full hover:bg-white/20 transition opacity-40 cursor-not-allowed" title="Video (not available)"><Video size={20} className="text-white" /></button>
          <button className="p-2 rounded-full hover:bg-white/20 transition"><Search size={20} className="text-white" /></button>
          <button className="p-2 rounded-full hover:bg-white/20 transition"><MoreVertical size={20} className="text-white" /></button>
        </div>
      </div>

      {sendErr && <div className="px-4 py-2 text-sm font-medium text-center" style={{ background: '#fef2f2', color: '#dc2626', borderBottom: '1px solid #fecaca' }}>{sendErr}</div>}

      <div className="flex-1 relative overflow-hidden">
        <div ref={scrollRef} onScroll={() => { const el = scrollRef.current; if (el) setShowScroll(el.scrollHeight - el.scrollTop - el.clientHeight > 120); }}
          className="h-full overflow-y-auto py-4" style={{ backgroundColor: '#efeae2', backgroundImage: WALLPAPER, backgroundSize: '80px 80px' }}>
          {messagesLoading && messages.length === 0 && <div className="flex items-center justify-center py-8"><div className="px-4 py-2 rounded-full text-sm shadow-sm" style={{ background: '#fff', color: '#667781' }}>Loading messages…</div></div>}
          <div className="pb-2">
            {messages.map((msg, idx) => {
              const prev = idx > 0 ? messages[idx - 1] : null;
              const showDate = !prev || !sameDay(prev.timestamp, msg.timestamp);
              return (
                <React.Fragment key={msg.id}>
                  {showDate && <div className="flex items-center justify-center my-3 px-4"><span className="px-3 py-1 rounded-full text-xs shadow-sm" style={{ background: '#e1f2fb', color: '#54656f' }}>{dateSep(msg.timestamp)}</span></div>}
                  <MessageBubble message={msg} onReply={setReplyTo} onForward={setFwdMsg} allMessages={messages} />
                </React.Fragment>
              );
            })}
          </div>
          <div ref={endRef} />
        </div>
        {showScroll && <button onClick={() => scrollBottom()} className="absolute bottom-4 right-4 w-10 h-10 rounded-full shadow-lg flex items-center justify-center z-10" style={{ background: '#fff' }}><ChevronDown size={20} style={{ color: '#667781' }} /></button>}
      </div>

      <ChatInput onSendMessage={handleSend} onSendDocument={handleDoc} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} disabled={sending} />

      {fwdMsg && <ForwardModal message={fwdMsg} threads={threads} onClose={() => setFwdMsg(null)} />}
    </div>
  );
}
