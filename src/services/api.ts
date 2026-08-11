const API_BASE = import.meta.env.VITE_API_URL;

export function getToken(): string { return localStorage.getItem("console_token") || ""; }
export function setToken(t: string) { localStorage.setItem("console_token", t); }
export function clearToken() { localStorage.removeItem("console_token"); }
export function hasToken(): boolean { return !!getToken(); }

async function api(path: string, opt: RequestInit = {}): Promise<any> {
  const headers: Record<string, string> = { "X-Console-Token": getToken(), ...(opt.headers as Record<string, string> || {}) };
  if (opt.body instanceof FormData) delete headers["Content-Type"];
  const res = await fetch(`${API_BASE}${path}`, { ...opt, headers });
  if (res.status === 403) { clearToken(); throw new Error("UNAUTHORIZED"); }
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    let msg = t || `Server error: ${res.status}`;
    let windowClosed = false;
    try { const j = JSON.parse(t); if (j?.error) msg = j.error; if (j?.window_closed) windowClosed = true; } catch { /* plain text */ }
    const err = new Error(msg) as Error & { windowClosed?: boolean };
    err.windowClosed = windowClosed;
    throw err;
  }
  return res.json();
}

export interface Client { name: string; mobile: string; business: string; service: string; sheet: string; }
export interface DailySummary { totalMessages: number; totalClients: number; docsReceived: number; returnsSent: number; responseRate: number; }

export async function fetchDailySummary(): Promise<DailySummary> {
  try { return await api("/api/summary"); }
  catch (e) { if ((e as Error).message === "UNAUTHORIZED") throw e; return { totalMessages: 0, totalClients: 0, docsReceived: 0, returnsSent: 0, responseRate: 0 }; }
}

export async function fetchClients(): Promise<Client[]> {
  try { return await api("/api/clients"); } catch (e) { if ((e as Error).message === "UNAUTHORIZED") throw e; return []; }
}

export async function fetchChatThreads() {
  try { const j = await api("/chat/api/threads"); return j?.data || []; }
  catch (e) { if ((e as Error).message === "UNAUTHORIZED") throw e; return []; }
}

export async function fetchChatThread(mobile: string) {
  try { const j = await api(`/chat/api/thread?mobile=${encodeURIComponent(mobile)}`); return j?.data || []; }
  catch (e) { if ((e as Error).message === "UNAUTHORIZED") throw e; return []; }
}

export async function sendChatMessage(mobile: string, message: string): Promise<boolean> {
  const j = await api("/chat/api/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mobile, message }) });
  return j?.success === true;
}

export async function uploadFile(file: File): Promise<string> {
  const fd = new FormData(); fd.append("file", file);
  const j = await api("/chat/api/upload", { method: "POST", body: fd });
  if (!j?.success || !j?.url) throw new Error("Upload failed");
  return j.url;
}

export async function sendChatDocument(mobile: string, file: File, caption?: string): Promise<boolean> {
  const url = await uploadFile(file);
  const j = await api("/chat/api/send_media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mobile, media_url: url, caption: caption || "" }) });
  return j?.success === true;
}

export async function forwardMessage(toMobile: string, text: string, mediaUrl?: string): Promise<boolean> {
  const body: any = { to_mobile: toMobile, text };
  if (mediaUrl) body.media_url = mediaUrl;
  const j = await api("/chat/api/forward", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return j?.success === true;
}

export async function startReturns(type: "monthly" | "quarterly") {
  try { await api(`/returns/start/${type}`); return true; } catch (e) { if ((e as Error).message === "UNAUTHORIZED") throw e; return false; }
}
export async function stopReturns(type: "monthly" | "quarterly") {
  try { await api(`/returns/stop/${type}`); return true; } catch (e) { if ((e as Error).message === "UNAUTHORIZED") throw e; return false; }
}

export interface Contact {
  mobile: string; name: string; business: string; service: string; fee: string;
  workflow: { status: string; docs_received: string; docs_pending: string; notes: string };
  payment: { status: string; due: string };
}

export async function fetchContact(mobile: string): Promise<Contact | null> {
  try { return await api(`/api/contact/${encodeURIComponent(mobile)}`); }
  catch (e) { if ((e as Error).message === "UNAUTHORIZED") throw e; return null; }
}

export async function saveContactName(mobile: string, name: string): Promise<boolean> {
  const j = await api(`/api/contact/${encodeURIComponent(mobile)}/name`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
  return j?.ok === true;
}

/* ---- Human takeover: bot ko is chat me chup karana / wapas chalu karna ---- */
export interface BotPause { paused: boolean; until: string; }

export async function fetchBotPause(mobile: string): Promise<BotPause> {
  try { return await api(`/api/bot-pause/${encodeURIComponent(mobile)}`); }
  catch (e) { if ((e as Error).message === "UNAUTHORIZED") throw e; return { paused: false, until: "" }; }
}

export async function setBotPause(mobile: string, paused: boolean): Promise<BotPause> {
  return await api(`/api/bot-pause/${encodeURIComponent(mobile)}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paused }),
  });
}

/* ---- Approved templates (jab 24hr window band ho) ---- */
export interface Template { name: string; sid: string; preview: string; }

export async function fetchTemplates(): Promise<Template[]> {
  try { const j = await api("/chat/api/templates"); return j?.data || []; }
  catch (e) { if ((e as Error).message === "UNAUTHORIZED") throw e; return []; }
}

export async function sendTemplate(mobile: string, contentSid: string, preview: string): Promise<boolean> {
  const j = await api("/chat/api/send_template", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile, content_sid: contentSid, preview }),
  });
  return j?.success === true;
}

/* ---- Bot ki galti flag karo ---- */
export async function flagBotReply(mobile: string, text: string, note = ""): Promise<boolean> {
  const j = await api("/api/flag", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile, text, note }),
  });
  return j?.ok === true;
}

/* ---- Push notification diagnostics ---- */
export interface PushStatus { vapid_key_set: boolean; saved_subscriptions: number; }

export async function fetchPushStatus(): Promise<PushStatus | null> {
  try { return await api("/api/push-status"); }
  catch (e) { if ((e as Error).message === "UNAUTHORIZED") throw e; return null; }
}

export async function sendPushTest(): Promise<any> {
  return await api("/api/push-test", { method: "POST" });
}

/* ---- Bheje gaye messages ka status (tick ke liye) ---- */
export interface MsgStatus { sid: string; body: string; status: string; error: string; ts: number; }

export async function fetchMsgStatuses(mobile: string): Promise<MsgStatus[]> {
  try { const j = await api(`/api/statuses?mobile=${encodeURIComponent(mobile)}`); return j?.data || []; }
  catch (e) { if ((e as Error).message === "UNAUTHORIZED") throw e; return []; }
}

/* ================================================================
   CRM (Supabase-backed) — clients / staff / services add-edit-delete
   ================================================================ */

export interface CrmClient {
  id: string;
  mobile: string;
  name: string;
  business_name?: string | null;
  gstin?: string | null;
  assigned_to?: string | null;
  filing_mode?: string;
  primary_service?: string | null;
  language?: string;
  source?: string;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CrmStaff { id: string; name: string; email?: string | null; phone?: string | null; role: string; is_active: boolean; }
export interface CrmService { id: string; name: string; default_fee?: number | null; min_fee?: number | null; }

export async function fetchCrmClients(q = ""): Promise<CrmClient[]> {
  try { const j = await api(`/api/crm/clients${q ? `?q=${encodeURIComponent(q)}` : ""}`); return j?.data || []; }
  catch (e) { if ((e as Error).message === "UNAUTHORIZED") throw e; return []; }
}

export async function createCrmClient(data: Partial<CrmClient>): Promise<CrmClient> {
  const j = await api("/api/crm/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  return j.data;
}

export async function updateCrmClient(id: string, data: Partial<CrmClient>): Promise<CrmClient> {
  const j = await api(`/api/crm/clients/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  return j.data;
}

export async function deleteCrmClient(id: string): Promise<boolean> {
  const j = await api(`/api/crm/clients/${id}`, { method: "DELETE" });
  return !!j.data;
}

export async function restoreCrmClient(id: string): Promise<boolean> {
  const j = await api(`/api/crm/clients/${id}/restore`, { method: "POST" });
  return !!j.data;
}

export async function fetchCrmStaff(): Promise<CrmStaff[]> {
  try { const j = await api("/api/crm/staff"); return j?.data || []; }
  catch (e) { if ((e as Error).message === "UNAUTHORIZED") throw e; return []; }
}

export async function fetchCrmServices(): Promise<CrmService[]> {
  try { const j = await api("/api/crm/services"); return j?.data || []; }
  catch (e) { if ((e as Error).message === "UNAUTHORIZED") throw e; return []; }
}
