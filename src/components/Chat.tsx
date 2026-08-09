import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchChatThreads, fetchChatThread, sendChatMessage, sendChatDocument } from '../services/api';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';
import type { Thread, FlatMessage, BackendMessage } from './chatTypes';

function authErr(e: unknown) { if (e instanceof Error && e.message === "UNAUTHORIZED") window.dispatchEvent(new Event("auth-failed")); }
function badge(n: number) { try { if ('setAppBadge' in navigator) { if (n > 0) (navigator as any).setAppBadge(n); else (navigator as any).clearAppBadge(); } } catch {} }
function clearNotifs(mobile: string) { try { navigator.serviceWorker?.ready.then(reg => reg.getNotifications({ tag: mobile }).then(ns => ns.forEach(n => n.close()))).catch(() => {}); } catch {} }

function flatten(msgs: BackendMessage[], rm: React.MutableRefObject<Record<string, string>>): FlatMessage[] {
  return msgs.map((m, i) => ({ id: `${i}-${m.from}`, text: m.text || '', sender: (m.from === 'user' ? 'me' : 'other') as 'me' | 'other', timestamp: m.time || '', status: m.from === 'user' ? 'read' as const : undefined, replyToId: rm.current[`${i}-${m.from}`] }));
}

export default function Chat() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<FlatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const selRef = useRef<string | null>(null);
  const prevRef = useRef<Record<string, string>>({});
  const notifRef = useRef(false);
  const replyMap = useRef<Record<string, string>>({});
  const lenRef = useRef(0);

  useEffect(() => { const c = () => setMobile(window.innerWidth < 768); c(); window.addEventListener('resize', c); return () => window.removeEventListener('resize', c); }, []);
  useEffect(() => { selRef.current = sel; }, [sel]);
  useEffect(() => { lenRef.current = msgs.length; }, [msgs]);
  useEffect(() => { const t = Object.values(unread).reduce((s, c) => s + c, 0); badge(t); document.title = t > 0 ? `(${t}) ATOZ Taxation` : 'ATOZ Taxation'; }, [unread]);
  useEffect(() => () => { badge(0); }, []);

  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') notifRef.current = true;
    else if (Notification.permission !== 'denied') Notification.requestPermission().then(p => { notifRef.current = p === 'granted'; });
  }, []);

  useEffect(() => {
    const h = (e: MessageEvent) => { if (e.data?.type === 'OPEN_CHAT' && e.data?.mobile) { setSel(e.data.mobile); setUnread(p => ({ ...p, [e.data.mobile]: 0 })); clearNotifs(e.data.mobile); } };
    navigator.serviceWorker?.addEventListener('message', h);
    return () => navigator.serviceWorker?.removeEventListener('message', h);
  }, []);

  const notify = useCallback((t: Thread, body: string) => {
    if (!notifRef.current) return;
    try { const n = new Notification(t.name || t.mobile, { body, icon: '/icon-192.png', tag: t.mobile, vibrate: [200, 100, 200] }); n.onclick = () => { window.focus(); setSel(t.mobile); setUnread(p => ({ ...p, [t.mobile]: 0 })); clearNotifs(t.mobile); n.close(); }; } catch {}
  }, []);

  const loadThreads = useCallback(async () => {
    try {
      const data: Thread[] = await fetchChatThreads();
      const sorted = [...data].sort((a, b) => (b.timestamp ? new Date(b.timestamp).getTime() : 0) - (a.timestamp ? new Date(a.timestamp).getTime() : 0));
      sorted.forEach(t => {
        const curr = t.lastMessage || '', prev = prevRef.current[t.mobile], active = t.mobile === selRef.current;
        if (prev !== undefined && prev !== curr && curr) { if (!active) { setUnread(p => ({ ...p, [t.mobile]: (p[t.mobile] || 0) + 1 })); notify(t, curr); } else if (!document.hasFocus()) notify(t, curr); }
        prevRef.current[t.mobile] = curr;
      });
      setThreads(sorted);
    } catch (e) { authErr(e); }
  }, [notify]);

  useEffect(() => { loadThreads(); const iv = setInterval(loadThreads, 5000); return () => clearInterval(iv); }, [loadThreads]);

  const loadThread = useCallback(async (m: string, init = false) => {
    if (init) setLoading(true);
    try { const d: BackendMessage[] = await fetchChatThread(m); setMsgs(flatten(d, replyMap)); } catch (e) { authErr(e); }
    finally { if (init) setLoading(false); }
  }, []);

  useEffect(() => { if (!sel) return; loadThread(sel, true); const iv = setInterval(() => loadThread(sel), 3000); return () => clearInterval(iv); }, [sel, loadThread]);
  useEffect(() => { if (sel) clearNotifs(sel); }, [sel, msgs]);

  const handleSend = useCallback(async (text: string, reply?: FlatMessage) => {
    if (!sel) return;
    if (reply) replyMap.current[`${lenRef.current}-user`] = reply.id;
    try { await sendChatMessage(sel, text); await loadThread(sel); } catch (e) { authErr(e); throw e; }
  }, [sel, loadThread]);

  const handleDoc = useCallback(async (file: File) => {
    if (!sel) return;
    try { await sendChatDocument(sel, file); await loadThread(sel); } catch (e) { authErr(e); throw e; }
  }, [sel, loadThread]);

  return (
    <div className="h-full w-full flex overflow-hidden" style={{ background: '#f0f2f5' }}>
      <ChatSidebar threads={threads} selectedMobile={sel} onSelectThread={m => { setSel(m); setUnread(p => ({ ...p, [m]: 0 })); clearNotifs(m); }} isMobile={mobile} unreadCounts={unread} />
      <ChatWindow selectedMobile={sel} threads={threads} messages={msgs} messagesLoading={loading} isMobile={mobile} onBack={() => setSel(null)} onSendMessage={handleSend} onSendDocument={handleDoc} />
    </div>
  );
}
