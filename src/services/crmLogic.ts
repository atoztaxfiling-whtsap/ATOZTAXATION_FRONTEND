/* ============================================================
   crmLogic.ts — saara hisaab-kitaab yahin
   ============================================================
   Periods, rates, ledger, balance, defaulters, due dates —
   sab kuch tumhare CRM demo ke exact logic se. Ek hi jagah,
   taaki har screen same jawab de.
   ============================================================ */

export const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const QUARTER_NAMES = ["JFM", "AMJ", "JAS", "OND"];

export const FILING_STATUSES = [
  "Yet to Pick", "Documents Pending", "Documents Received", "Query Raised",
  "GSTR1 Done", "In Progress", "Completed", "Not Responding",
];
export const REG_STATUSES = [
  "Documents Pending", "Documents Received", "Query", "Waiting for Reply",
  "Need Clarification", "Department Approval", "Completed", "Closed Lost", "Not Responding",
];
export const TASK_CATEGORIES = ["Income tax", "TDS", "GST registration", "Other"];
export const TASK_STATUSES = [
  "Yet to Pick", "Documents Pending", "Documents Received", "Query Raised",
  "In progress", "Waiting for Reply", "Completed", "Payment Pending",
  "Closed", "Not Responding",
];
/* ---------- Fee kab due banti hai ----------
   Kaam poora hone se pehle fee due nahi hoti. Amount phir bhi dikhta hai
   (grey), taaki pata rahe kitna banega — par "baaki" me nahi ginta. */
export const FILING_BILLABLE = ["Completed"];
export const TASK_BILLABLE = ["Completed", "Payment Pending", "Closed"];
/* payments.kind = 'firm_paid' matlab humne client ki taraf se bhara hai */
export const KIND_FIRM_PAID = "firm_paid";
export function isFilingBillable(status?: string | null) { return FILING_BILLABLE.includes(status || ""); }
export function isTaskBillable(status?: string | null) { return TASK_BILLABLE.includes(status || ""); }

export const FILING_MODES = [
  { value: "auto", label: "Auto: quarter khatam hone tak monthly, phir quarterly" },
  { value: "manual-monthly", label: "Hamesha monthly" },
  { value: "manual-quarterly", label: "Hamesha quarterly" },
];

/* ---------- Types ---------- */
export interface Client {
  id: string; mobile: string; name: string;
  business_name?: string | null; gstin?: string | null;
  portal_username?: string | null; portal_password?: string | null;
  assigned_to?: string | null; filing_mode?: string | null;
  reg_year?: number | null; reg_month?: number | null;
  fee_monthly_nil?: number | null; fee_monthly_sales?: number | null;
  fee_quarterly_nil?: number | null; fee_quarterly_sales?: number | null;
  followup_text?: string | null;
  linked_client_ids?: string[] | null;
  other_logins?: Array<{ label: string; username: string; password: string }> | null;
  primary_service?: string | null; source?: string | null; notes?: string | null;
  is_active?: boolean; created_at?: string;
}
export interface Filing {
  id: string; client_id: string; period_key: string; cycle: string;
  type?: string | null; status: string; fee_due?: number | null; comment?: string | null;
}
export interface Payment { id: string; client_id: string; amount: number; paid_on: string; method?: string | null; note?: string | null; kind?: string | null; }
export interface Task {
  id: string; client_id?: string | null; name: string; mobile?: string | null;
  category?: string | null; status: string; assigned_to?: string | null;
  received_date?: string | null; fee_agreed?: number | null; amount_paid?: number | null; comment?: string | null;
}
export interface Registration {
  id: string; mobile?: string | null; name: string; business_name?: string | null;
  trn?: string | null; status: string; assigned_to?: string | null;
  converted_client_id?: string | null; comment?: string | null;
}
export interface Staff { id: string; name: string; role: string; email?: string | null; phone?: string | null; }
export interface Service { id: string; name: string; default_fee?: number | null; min_fee?: number | null; note?: string | null; }
export interface ClientNote { id: string; client_id: string; text: string; created_at: string; created_by?: string | null; }
export interface Followup {
  id: string; client_id: string; kind: string; status: string;
  planned_at?: string | null; note?: string | null; sent_count?: number;
}
export interface Escalation {
  id: string; client_id?: string | null; mobile?: string | null;
  question?: string | null; reason?: string | null; status: string; created_at: string;
}

export interface Period { key: string; label: string; cycle: "monthly" | "quarterly"; }
export interface FilingEntry { status: string; type: string; comment: string; fee_due: number | null; id?: string; }
export interface LedgerRow {
  period: string; key: string; cycle: string; type: string; status: string;
  due: number; paid: number; balance: number; isOverride: boolean;
  fullDue: number; billable: boolean;
}
/* Firm ne client ki taraf se jo bhara (late fee, challan) */
export interface AdvanceRow { id: string; on: string; note: string; method: string; due: number; paid: number; balance: number; }
/* Workflow ka poora ho chuka one-off kaam */
export interface TaskDueRow { id: string; name: string; status: string; due: number; paid: number; balance: number; }
export interface FullLedger { periods: LedgerRow[]; advances: AdvanceRow[]; tasks: TaskDueRow[]; balance: number; leftover: number; }

export interface Bootstrap {
  clients: Client[]; filings: Filing[]; payments: Payment[];
  registrations: Registration[]; tasks: Task[]; staff: Staff[];
  services: Service[]; notes: ClientNote[];
  followups: Followup[]; escalations: Escalation[];
}

/* ---------- Period math (reg_month 1-12) ---------- */
export function monthIndex(y: number, m1to12: number) { return y * 12 + (m1to12 - 1); }
export function todayIndex() { const t = new Date(); return t.getFullYear() * 12 + t.getMonth(); }
export function monthLabel(idx: number) { return `${MONTH_NAMES[idx % 12]} ${Math.floor(idx / 12)}`; }
export function quarterStartIndex(idx: number) { const y = Math.floor(idx / 12), m = idx % 12; return y * 12 + Math.floor(m / 3) * 3; }
export function quarterLabel(qIdx: number) { return `${QUARTER_NAMES[(qIdx % 12) / 3]} ${Math.floor(qIdx / 12)}`; }

function pad2(n: number) { return n < 10 ? `0${n}` : `${n}`; }
export function keyM(idx: number) { return `M${Math.floor(idx / 12)}-${pad2((idx % 12) + 1)}`; }
export function keyQ(qIdx: number) { return `Q${Math.floor(qIdx / 12)}-${pad2((qIdx % 12) + 1)}`; }

function clientStartIndex(c: Client) {
  if (c.reg_year && c.reg_month) return monthIndex(c.reg_year, c.reg_month);
  if (c.created_at) { const d = new Date(c.created_at); return d.getFullYear() * 12 + d.getMonth(); }
  return todayIndex();
}

/** Client ke registration se aaj tak ke saare periods. */
export function clientPeriods(c: Client): Period[] {
  const regIdx = clientStartIndex(c);
  const tIdx = todayIndex();
  const mode = c.filing_mode || "auto";
  const out: Period[] = [];
  if (mode === "manual-monthly") {
    for (let i = regIdx; i <= tIdx; i++) out.push({ key: keyM(i), label: monthLabel(i), cycle: "monthly" });
  } else if (mode === "manual-quarterly") {
    const tq = quarterStartIndex(tIdx);
    for (let i = quarterStartIndex(regIdx); i <= tq; i += 3) out.push({ key: keyQ(i), label: quarterLabel(i), cycle: "quarterly" });
  } else {
    // auto: registration ke quarter ke end tak monthly, uske baad quarterly
    const qStartOfReg = quarterStartIndex(regIdx);
    const monthlyEnd = Math.min(qStartOfReg + 2, tIdx);
    for (let i = regIdx; i <= monthlyEnd; i++) out.push({ key: keyM(i), label: monthLabel(i), cycle: "monthly" });
    const tq = quarterStartIndex(tIdx);
    for (let i = qStartOfReg + 3; i <= tq; i += 3) out.push({ key: keyQ(i), label: quarterLabel(i), cycle: "quarterly" });
  }
  return out;
}

export function currentPeriod(c: Client): Period | null {
  const p = clientPeriods(c);
  return p.length ? p[p.length - 1] : null;
}
export function currentCycle(c: Client): "monthly" | "quarterly" {
  const cp = currentPeriod(c);
  if (cp) return cp.cycle;
  return c.filing_mode === "manual-monthly" ? "monthly" : "quarterly";
}
export function findClientPeriod(c: Client, key: string) { return clientPeriods(c).find(p => p.key === key) || null; }

/* ---------- Filing entry lookup ---------- */
export function buildFilingMap(filings: Filing[]) {
  const map: Record<string, Filing> = {};
  filings.forEach(f => { map[`${f.client_id}|${f.period_key}`] = f; });
  return map;
}
export function filingEntry(map: Record<string, Filing>, clientId: string, key: string): FilingEntry {
  const f = map[`${clientId}|${key}`];
  if (!f) return { status: "Yet to Pick", type: "nil", comment: "", fee_due: null };
  return { id: f.id, status: f.status || "Yet to Pick", type: f.type || "nil", comment: f.comment || "", fee_due: f.fee_due ?? null };
}

/* ---------- Fees ---------- */
export function periodFee(c: Client, period: Period, type?: string) {
  const t = type || "nil";
  if (period.cycle === "monthly") return Number(t === "nil" ? c.fee_monthly_nil : c.fee_monthly_sales) || 0;
  return Number(t === "nil" ? c.fee_quarterly_nil : c.fee_quarterly_sales) || 0;
}
export function rateFor(c: Client, cycle: string, type: string) {
  if (cycle === "monthly") return Number(type === "nil" ? c.fee_monthly_nil : c.fee_monthly_sales) || 0;
  return Number(type === "nil" ? c.fee_quarterly_nil : c.fee_quarterly_sales) || 0;
}

/* ---------- Payment buckets ----------
   Client ka diya hua paisa, aur firm ne client ki taraf se jo bhara —
   dono alag rakhne padte hain, warna hisaab ulta ho jata hai. */
export function paymentsOf(payments: Payment[], clientId: string) { return payments.filter(p => p.client_id === clientId); }
export function clientPayments(payments: Payment[], clientId: string) {
  return paymentsOf(payments, clientId).filter(p => (p.kind || "client") !== KIND_FIRM_PAID);
}
export function firmPaidEntries(payments: Payment[], clientId: string) {
  return paymentsOf(payments, clientId)
    .filter(p => (p.kind || "client") === KIND_FIRM_PAID)
    .slice().sort((a, b) => String(a.paid_on || "").localeCompare(String(b.paid_on || "")));
}
export function paymentPool(payments: Payment[], clientId: string) {
  return clientPayments(payments, clientId).reduce((a, p) => a + Number(p.amount || 0), 0);
}

/* ---------- Ledger (FIFO — purana period pehle clear hota hai) ----------
   due      = jo abhi maang sakte ho (kaam poora na ho to 0)
   fullDue  = poora rate, chahe kaam bacha ho (sirf dikhane ke liye) */
export function ledgerRows(c: Client, map: Record<string, Filing>, payments: Payment[]): LedgerRow[] {
  let remaining = paymentPool(payments, c.id);
  return clientPeriods(c).map(period => {
    const e = filingEntry(map, c.id, period.key);
    const fullDue = e.fee_due != null ? Number(e.fee_due) : periodFee(c, period, e.type);
    const billable = isFilingBillable(e.status);
    const due = billable ? fullDue : 0;
    const paid = Math.min(remaining, due);
    remaining -= paid;
    return { period: period.label, key: period.key, cycle: period.cycle, type: e.type, status: e.status, due, fullDue, billable, paid, balance: due - paid, isOverride: e.fee_due != null };
  });
}

/* Poora hisaab ek jagah — periods, phir firm ka bhara hua, phir one-off kaam */
export function fullLedger(c: Client, map: Record<string, Filing>, payments: Payment[], tasks: Task[]): FullLedger {
  const periods = ledgerRows(c, map, payments);
  let remaining = paymentPool(payments, c.id) - periods.reduce((a, r) => a + r.paid, 0);

  const advances: AdvanceRow[] = firmPaidEntries(payments, c.id).map(p => {
    const due = Number(p.amount || 0);
    const paid = Math.min(remaining, due);
    remaining -= paid;
    return { id: p.id, on: p.paid_on || "", note: p.note || "", method: p.method || "", due, paid, balance: due - paid };
  });

  const taskRows: TaskDueRow[] = [];
  for (const t of tasksForClient(tasks, c.id)) {
    if (!isTaskBillable(t.status)) continue;
    const due = (Number(t.fee_agreed) || 0) - (Number(t.amount_paid) || 0);
    if (due <= 0) continue;
    const paid = Math.min(remaining, due);
    remaining -= paid;
    taskRows.push({ id: t.id, name: t.name, status: t.status, due, paid, balance: due - paid });
  }

  const balance = periods.reduce((a, r) => a + r.balance, 0)
    + advances.reduce((a, r) => a + r.balance, 0)
    + taskRows.reduce((a, r) => a + r.balance, 0);

  return { periods, advances, tasks: taskRows, balance, leftover: Math.max(remaining, 0) };
}

export function tasksForClient(tasks: Task[], clientId: string) { return tasks.filter(t => t.client_id === clientId); }
/* Sirf poore ho chuke kaam ki baaki fee */
export function oneOffDue(tasks: Task[], clientId: string) {
  return tasksForClient(tasks, clientId).reduce((a, t) => {
    if (!isTaskBillable(t.status)) return a;
    const d = (Number(t.fee_agreed) || 0) - (Number(t.amount_paid) || 0);
    return a + (d > 0 ? d : 0);
  }, 0);
}
export function oneOffPaid(tasks: Task[], clientId: string) {
  return tasksForClient(tasks, clientId).reduce((a, t) => a + (Number(t.amount_paid) || 0), 0);
}
/* Humne client ke liye kitna bhara — kharche ka hisaab */
export function totalFirmPaid(payments: Payment[], clientId: string) {
  return firmPaidEntries(payments, clientId).reduce((a, p) => a + Number(p.amount || 0), 0);
}

export function balanceDue(c: Client, map: Record<string, Filing>, payments: Payment[], tasks: Task[]) {
  return fullLedger(c, map, payments, tasks).balance;
}
/* Client se jitna paisa AAYA. Firm ne jo bhara wo isme nahi ginte. */
export function totalPaid(c: Client, payments: Payment[], tasks: Task[]) {
  return paymentPool(payments, c.id) + oneOffPaid(tasks, c.id);
}

export function isDefaulter(c: Client, map: Record<string, Filing>) {
  const q = clientPeriods(c).filter(p => p.cycle === "quarterly");
  const last3 = q.slice(-3);
  if (last3.length < 3) return false;
  return last3.every(p => filingEntry(map, c.id, p.key).status !== "Completed");
}

/* ---------- Global period lists (dropdowns ke liye) ---------- */
export function globalQuarterPeriods(clients: Client[]) {
  if (!clients.length) return [] as Period[];
  const minIdx = Math.min(...clients.map(c => quarterStartIndex(clientStartIndex(c))));
  const maxIdx = quarterStartIndex(todayIndex());
  const out: Period[] = [];
  for (let i = minIdx; i <= maxIdx; i += 3) out.push({ key: keyQ(i), label: quarterLabel(i), cycle: "quarterly" });
  return out;
}
export function globalMonthPeriods(clients: Client[]) {
  if (!clients.length) return [] as Period[];
  const minIdx = Math.min(...clients.map(c => clientStartIndex(c)));
  const maxIdx = todayIndex();
  const out: Period[] = [];
  for (let i = minIdx; i <= maxIdx; i++) out.push({ key: keyM(i), label: monthLabel(i), cycle: "monthly" });
  return out;
}

/* ---------- GST due dates ---------- */
function idxFromKey(key: string) {
  const y = parseInt(key.slice(1, 5), 10);
  const m = parseInt(key.slice(6, 8), 10);
  return y * 12 + (m - 1);
}
function idxToDate(idx: number, day: number) { return new Date(Math.floor(idx / 12), idx % 12, day); }

export function dueDatesForPeriod(period: Period) {
  if (period.cycle === "monthly") {
    const n = idxFromKey(period.key) + 1;
    return [{ label: "GSTR-1", date: idxToDate(n, 11) }, { label: "GSTR-3B", date: idxToDate(n, 20) }];
  }
  const n = idxFromKey(period.key) + 3;
  return [{ label: "GSTR-1 (IFF)", date: idxToDate(n, 13) }, { label: "GSTR-3B (Qtr)", date: idxToDate(n, 22) }];
}
export function daysUntil(d: Date) {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const dd = new Date(d); dd.setHours(0, 0, 0, 0);
  return Math.round((dd.getTime() - t.getTime()) / 86400000);
}
export function fmtDate(d: Date) { return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }); }

/* ---------- Display helpers ---------- */
export function initials(n?: string | null) {
  if (!n || n === "—") return "?";
  return n.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}
export function pillClass(status: string) {
  if (["Completed", "Paid", "GSTR1 Done"].includes(status)) return "bg-[#E1F5EE] text-[#04342C]";
  if (["In progress", "In Progress", "Partial", "Documents Received", "Query Raised", "Query", "Department Approval", "Waiting for Reply", "Need Clarification"].includes(status)) return "bg-[#FAEEDA] text-[#412402]";
  if (["Yet to Pick", "Pending", "Overdue", "Closed Lost", "Documents Pending", "Not Responding", "Not paid"].includes(status)) return "bg-[#FCEBEB] text-[#501313]";
  return "bg-[#E6F1FB] text-[#185FA5]";
}
export function money(n: number) { return `₹${Math.round(n).toLocaleString("en-IN")}`; }

/* ---------- WhatsApp templates ---------- */
export interface Template { id: string; label: string; text: (c: Client, ctx: { balance: number; period: string }) => string; }
export const TEMPLATES: Template[] = [
  { id: "payment", label: "Payment reminder", text: (c, x) => `Namaste ${c.name}, aapka GST filing ka ${money(x.balance)} balance pending hai. Kripya jald bhej dein. Dhanyavaad — ATOZ Taxation` },
  { id: "docs", label: "Documents request", text: (c, x) => `Namaste ${c.name}, ${x.period || "is period"} ke GST filing ke liye documents chahiye (sales/purchase invoices, bank statement). Kripya jald bhej dein. — ATOZ Taxation` },
  { id: "filed", label: "Filing done — confirmation", text: (c, x) => `Namaste ${c.name}, aapka ${x.period} ka GST filing complete ho gaya hai. Dhanyavaad — ATOZ Taxation` },
  { id: "defaulter", label: "Defaulter reminder", text: c => `Namaste ${c.name}, aapka pichle kuch quarters ka GST filing pending hai. Kripya jaldi contact karein. — ATOZ Taxation` },
  { id: "followup", label: "General follow-up", text: c => `Namaste ${c.name}, aapke GST filing ke regarding follow-up karna tha. Kripya samay milte hi contact karein. — ATOZ Taxation` },
];
export function waLink(mobile: string | null | undefined, text: string) {
  const num = (mobile || "").replace(/\D/g, "");
  const base = num.length === 10 ? `https://wa.me/91${num}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}

export function checkDuplicateGSTIN(clients: Client[], gstin: string, excludeId?: string) {
  if (!gstin || gstin === "—") return null;
  return clients.find(c => c.gstin === gstin && c.id !== excludeId) || null;
}
