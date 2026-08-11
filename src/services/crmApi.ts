/* ============================================================
   crmApi.ts — CRM ke saare backend calls
   ============================================================ */
import type { Bootstrap, Client, Filing, Payment, Registration, Task, Staff, Service } from "./crmLogic";

const API_BASE = import.meta.env.VITE_API_URL;

function token() { return localStorage.getItem("console_token") || ""; }

async function req(path: string, opt: RequestInit = {}): Promise<any> {
  const headers: Record<string, string> = { "X-Console-Token": token(), ...(opt.headers as Record<string, string> || {}) };
  const res = await fetch(`${API_BASE}/api/crm${path}`, { ...opt, headers });
  if (res.status === 403) { localStorage.removeItem("console_token"); window.dispatchEvent(new Event("auth-failed")); throw new Error("UNAUTHORIZED"); }
  const txt = await res.text();
  let json: any = {};
  try { json = txt ? JSON.parse(txt) : {}; } catch { /* plain text */ }
  if (!res.ok) throw new Error(json?.error || txt || `Server error: ${res.status}`);
  return json;
}

const jsonPost = (path: string, body: any, method = "POST") =>
  req(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

/* ---------- Bootstrap ---------- */
export async function fetchBootstrap(): Promise<Bootstrap> {
  const j = await req("/bootstrap");
  const d = j?.data || {};
  return {
    clients: d.clients || [], filings: d.filings || [], payments: d.payments || [],
    registrations: d.registrations || [], tasks: d.tasks || [], staff: d.staff || [],
    services: d.services || [], notes: d.notes || [],
  };
}

export async function crmHealth() { return req("/health"); }

/* ---------- Clients ---------- */
export const createClient = (d: Partial<Client>): Promise<Client> => jsonPost("/clients", d).then(r => r.data);
export const updateClient = (id: string, d: Partial<Client>): Promise<Client> => jsonPost(`/clients/${id}`, d, "PUT").then(r => r.data);
export const deleteClient = (id: string) => req(`/clients/${id}`, { method: "DELETE" }).then(r => r.data);
export const restoreClient = (id: string) => req(`/clients/${id}/restore`, { method: "POST" }).then(r => r.data);
export const addClientNote = (id: string, text: string) => jsonPost(`/clients/${id}/notes`, { text }).then(r => r.data);
export const deleteClientNote = (cid: string, nid: string) => req(`/clients/${cid}/notes/${nid}`, { method: "DELETE" });

/* ---------- Filings ---------- */
export const upsertFiling = (d: { client_id: string; period_key: string; status?: string; type?: string; comment?: string; fee_due?: number | null }): Promise<Filing> =>
  jsonPost("/filings/upsert", d).then(r => r.data);

/* ---------- Payments ---------- */
export const createPayment = (d: { client_id: string; amount: number; method?: string; note?: string }): Promise<Payment> =>
  jsonPost("/payments", d).then(r => r.data);
export const deletePayment = (id: string) => req(`/payments/${id}`, { method: "DELETE" }).then(r => r.data);
export const restorePayment = (id: string) => req(`/payments/${id}/restore`, { method: "POST" }).then(r => r.data);

/* ---------- Registrations ---------- */
export const createRegistration = (d: Partial<Registration>): Promise<Registration> => jsonPost("/registrations", d).then(r => r.data);
export const updateRegistration = (id: string, d: Partial<Registration>): Promise<Registration> => jsonPost(`/registrations/${id}`, d, "PUT").then(r => r.data);
export const deleteRegistration = (id: string) => req(`/registrations/${id}`, { method: "DELETE" }).then(r => r.data);
export const convertRegistration = (id: string, d: Partial<Client>): Promise<Client> => jsonPost(`/registrations/${id}/convert`, d).then(r => r.data);

/* ---------- Tasks (Workflow) ---------- */
export const createTask = (d: Partial<Task>): Promise<Task> => jsonPost("/tasks", d).then(r => r.data);
export const updateTask = (id: string, d: Partial<Task>): Promise<Task> => jsonPost(`/tasks/${id}`, d, "PUT").then(r => r.data);
export const deleteTask = (id: string) => req(`/tasks/${id}`, { method: "DELETE" }).then(r => r.data);
export const restoreTask = (id: string) => req(`/tasks/${id}/restore`, { method: "POST" }).then(r => r.data);

/* ---------- Staff ---------- */
export const createStaff = (d: Partial<Staff>): Promise<Staff> => jsonPost("/staff", d).then(r => r.data);
export const updateStaff = (id: string, d: Partial<Staff>): Promise<Staff> => jsonPost(`/staff/${id}`, d, "PUT").then(r => r.data);
export const deleteStaff = (id: string) => req(`/staff/${id}`, { method: "DELETE" }).then(r => r.data);
export const restoreStaff = (id: string) => req(`/staff/${id}/restore`, { method: "POST" }).then(r => r.data);

/* ---------- Services ---------- */
export const createService = (d: Partial<Service>): Promise<Service> => jsonPost("/services", d).then(r => r.data);
export const updateService = (id: string, d: Partial<Service>): Promise<Service> => jsonPost(`/services/${id}`, d, "PUT").then(r => r.data);
export const deleteService = (id: string) => req(`/services/${id}`, { method: "DELETE" }).then(r => r.data);
export const restoreService = (id: string) => req(`/services/${id}/restore`, { method: "POST" }).then(r => r.data);

/* ---------- Audit ---------- */
export const fetchAuditLog = (q = "") => req(`/audit-log${q}`).then(r => r.data || []);
