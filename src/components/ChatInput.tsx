import { useState, useRef, useEffect } from 'react';
import { Smile, Paperclip, Send, Mic, X, FileText, Image, Camera, Square, Trash2 } from 'lucide-react';
import EmojiPicker from './EmojiPicker';
import type { FlatMessage, AttachmentPreview } from './chatTypes';

interface Props { onSendMessage: (t: string, r?: FlatMessage) => void; onSendDocument: (f: File) => void; replyTo: FlatMessage | null; onCancelReply: () => void; disabled?: boolean; }

function fmtDur(s: number) { return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`; }

export default function ChatInput({ onSendMessage, onSendDocument, replyTo, onCancelReply, disabled }: Props) {
  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [attach, setAttach] = useState<AttachmentPreview | null>(null);
  const [toast, setToast] = useState('');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recDur, setRecDur] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3000); return () => clearTimeout(t); }, [toast]);
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  const startRec = async () => { try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); const mr = new MediaRecorder(s, { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm' }); mrRef.current = mr; chunks.current = []; mr.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data); }; mr.onstop = () => { const b = new Blob(chunks.current, { type: 'audio/webm' }); setAudioBlob(b); setAudioUrl(URL.createObjectURL(b)); s.getTracks().forEach(t => t.stop()); }; mr.start(); setRecording(true); setRecDur(0); timer.current = setInterval(() => setRecDur(p => p + 1), 1000); } catch { setToast('Mic access denied'); } };
  const stopRec = () => { if (mrRef.current?.state !== 'inactive') mrRef.current?.stop(); setRecording(false); if (timer.current) { clearInterval(timer.current); timer.current = null; } };
  const cancelRec = () => { stopRec(); setAudioBlob(null); if (audioUrl) URL.revokeObjectURL(audioUrl); setAudioUrl(null); setRecDur(0); };

  const handleSend = async () => {
    if (sending) return; setSending(true);
    try {
      if (audioBlob) { const f = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' }); onSendDocument(f); setAudioBlob(null); if (audioUrl) URL.revokeObjectURL(audioUrl); setAudioUrl(null); setRecDur(0); return; }
      if (attach) { onSendDocument(attach.file); URL.revokeObjectURL(attach.url); setAttach(null); onCancelReply(); return; }
      if (!input.trim()) return; onSendMessage(input.trim(), replyTo ?? undefined); setInput(''); onCancelReply(); if (taRef.current) taRef.current.style.height = 'auto';
    } catch { setToast('Bhejne me error'); } finally { setSending(false); }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'document') => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 16 * 1024 * 1024) { setToast('File 16MB limit'); e.target.value = ''; return; } setAttach({ file: f, url: URL.createObjectURL(f), type }); setShowAttach(false); e.target.value = ''; };
  const onInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => { setInput(e.target.value); const el = e.target; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 100) + 'px'; };
  const canSend = input.trim().length > 0 || attach !== null || audioBlob !== null;

  if (recording) return (
    <div className="flex-shrink-0" style={{ background: '#f0f2f5' }}><div className="flex items-center gap-3 px-3 py-3">
      <button onClick={cancelRec} className="p-2.5 rounded-full hover:bg-red-100"><Trash2 size={20} style={{ color: '#e53e3e' }} /></button>
      <div className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ background: '#fff', border: '1px solid #e9edef' }}><div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" /><span className="text-sm font-medium" style={{ color: '#111b21' }}>Recording... {fmtDur(recDur)}</span></div>
      <button onClick={stopRec} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#00a884' }}><Square size={16} className="text-white" fill="white" /></button>
    </div></div>
  );

  if (audioBlob && audioUrl) return (
    <div className="flex-shrink-0" style={{ background: '#f0f2f5' }}><div className="flex items-center gap-3 px-3 py-3">
      <button onClick={cancelRec} className="p-2.5 rounded-full hover:bg-red-100"><Trash2 size={20} style={{ color: '#e53e3e' }} /></button>
      <div className="flex-1 px-3 py-2 rounded-xl" style={{ background: '#fff', border: '1px solid #e9edef' }}><audio controls src={audioUrl} className="w-full h-8" /></div>
      <button onClick={handleSend} disabled={sending} className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-50" style={{ background: '#00a884' }}>{sending ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={18} className="text-white" />}</button>
    </div></div>
  );

  return (
    <div className="relative flex-shrink-0" style={{ background: '#f0f2f5' }}>
      {toast && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full px-4 py-2 rounded-lg text-sm text-white shadow-lg z-50" style={{ background: toast.includes('error') || toast.includes('denied') || toast.includes('limit') ? '#e53e3e' : '#00a884' }}>{toast}</div>}
      {replyTo && (<div className="flex items-center gap-3 px-4 py-2" style={{ borderTop: '1px solid #e9edef' }}><div className="flex-1 px-3 py-1.5 rounded-lg border-l-4" style={{ background: '#fff', borderLeftColor: '#00a884' }}><p className="text-xs font-semibold" style={{ color: '#00a884' }}>{replyTo.sender === 'me' ? 'You' : 'Contact'}</p><p className="text-xs truncate" style={{ color: '#667781' }}>{replyTo.text.slice(0, 80)}</p></div><button onClick={onCancelReply} className="p-1 rounded-full hover:bg-gray-200"><X size={16} style={{ color: '#667781' }} /></button></div>)}
      {attach && (<div className="flex items-center gap-3 px-4 py-2" style={{ background: '#fff', borderTop: '1px solid #e9edef' }}>{attach.type === 'image' ? <img src={attach.url} alt="" className="w-14 h-14 object-cover rounded-lg" /> : <div className="flex items-center gap-2 flex-1 p-2 rounded-lg" style={{ background: '#f0f2f5' }}><FileText size={24} style={{ color: '#00a884' }} /><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate" style={{ color: '#111b21' }}>{attach.file.name}</p><p className="text-xs" style={{ color: '#667781' }}>{(attach.file.size / 1024).toFixed(1)} KB</p></div></div>}<button onClick={() => { URL.revokeObjectURL(attach.url); setAttach(null); }} className="p-1.5 rounded-full hover:bg-gray-200"><X size={16} style={{ color: '#667781' }} /></button></div>)}
      <div className="flex items-end gap-2 px-3 py-2">
        <div className="relative flex-shrink-0"><button onClick={() => { setShowEmoji(p => !p); setShowAttach(false); }} className="p-2 rounded-full hover:bg-gray-200"><Smile size={22} style={{ color: '#8696a0' }} /></button>{showEmoji && <EmojiPicker onSelect={e => setInput(p => p + e)} onClose={() => setShowEmoji(false)} />}</div>
        <div className="relative flex-shrink-0">
          <button onClick={() => { setShowAttach(p => !p); setShowEmoji(false); }} className="p-2 rounded-full hover:bg-gray-200"><Paperclip size={22} style={{ color: '#8696a0' }} /></button>
          {showAttach && (<><div className="fixed inset-0 z-40" onClick={() => setShowAttach(false)} /><div className="absolute bottom-full left-0 mb-2 rounded-xl shadow-xl overflow-hidden z-50" style={{ background: '#fff', border: '1px solid #e9edef', minWidth: '200px' }}>
            <button onClick={() => { camRef.current?.click(); setShowAttach(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm" style={{ color: '#111b21' }}><div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#00a884' }}><Camera size={16} className="text-white" /></div>Camera</button>
            <button onClick={() => { fileRef.current?.click(); setShowAttach(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm" style={{ color: '#111b21', borderTop: '1px solid #f0f2f5' }}><div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#bf5af2' }}><Image size={16} className="text-white" /></div>Photos & Videos</button>
            <button onClick={() => { docRef.current?.click(); setShowAttach(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm" style={{ color: '#111b21', borderTop: '1px solid #f0f2f5' }}><div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#f59e0b' }}><FileText size={16} className="text-white" /></div>Document</button>
          </div></>)}
          <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => onFile(e, 'image')} />
          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={e => onFile(e, 'image')} />
          <input ref={docRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.rar" className="hidden" onChange={e => onFile(e, 'document')} />
        </div>
        <div className="flex-1 rounded-xl px-4 py-2" style={{ background: '#fff', border: '1px solid #e9edef' }}><textarea ref={taRef} value={input} onChange={onInput} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Type a message" disabled={disabled || sending} rows={1} className="w-full bg-transparent text-sm resize-none focus:outline-none" style={{ color: '#111b21', maxHeight: '100px', lineHeight: '1.5' }} /></div>
        {canSend ? <button onClick={handleSend} disabled={disabled || sending} className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-50" style={{ background: '#00a884' }}>{sending ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={18} className="text-white" />}</button>
        : <button onClick={startRec} disabled={disabled} className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-50" style={{ background: '#00a884' }}><Mic size={18} className="text-white" /></button>}
      </div>
    </div>
  );
}
