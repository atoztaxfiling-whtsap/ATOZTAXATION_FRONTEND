/* Chhote reusable UI tukde — sab CRM screens inhe use karte hain */
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { initials, pillClass } from "../../services/crmLogic";

export function Avatar({ name, size = 30, onClick }: { name?: string | null; size?: number; onClick?: () => void }) {
  return (
    <div onClick={onClick}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={`rounded-full bg-[#E1F5EE] text-[#04342C] flex items-center justify-center font-semibold flex-shrink-0 ${onClick ? "cursor-pointer" : ""}`}>
      {initials(name)}
    </div>
  );
}

export function Pill({ status, children }: { status?: string; children?: ReactNode }) {
  return <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11.5px] font-medium whitespace-nowrap ${pillClass(status || "")}`}>{children ?? status}</span>;
}

export function PageHead({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
      <div>
        <h1 className="text-xl font-semibold text-[#1C1E1B]">{title}</h1>
        {sub && <p className="text-[12.5px] text-[#6B6F68] mt-0.5">{sub}</p>}
      </div>
      {actions && <div className="flex gap-2 items-center flex-wrap">{actions}</div>}
    </div>
  );
}

export function Panel({ children, head }: { children: ReactNode; head?: ReactNode }) {
  return (
    <div className="bg-white border border-[#E6E4DD] rounded-xl overflow-hidden">
      {head && <div className="flex items-center justify-between gap-2.5 flex-wrap px-4 py-3 border-b border-[#E6E4DD]">{head}</div>}
      {children}
    </div>
  );
}

export function Metric({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: string; tone?: "good" | "warn" | "danger" }) {
  const color = tone === "good" ? "text-[#0F6E56]" : tone === "warn" ? "text-[#BA7517]" : tone === "danger" ? "text-[#A32D2D]" : "text-[#1C1E1B]";
  return (
    <div className="bg-white border border-[#E6E4DD] rounded-xl px-4 py-4">
      <div className="text-[12px] text-[#6B6F68] mb-1.5">{label}</div>
      <div className={`text-[24px] font-semibold font-mono leading-none ${color}`}>{value}</div>
      {sub && <div className="text-[11.5px] text-[#9BA098] mt-1.5">{sub}</div>}
    </div>
  );
}

export function Btn({ children, onClick, variant = "default", size = "md", disabled, type = "button", className = "" }: {
  children: ReactNode; onClick?: () => void; variant?: "default" | "primary" | "danger"; size?: "sm" | "md"; disabled?: boolean; type?: "button" | "submit"; className?: string;
}) {
  const base = "inline-flex items-center gap-1.5 rounded-lg font-medium border transition disabled:opacity-50 whitespace-nowrap";
  const sz = size === "sm" ? "px-2.5 py-1 text-[12px]" : "px-3.5 py-2 text-[13px]";
  const v = variant === "primary" ? "bg-[#1C1E1B] text-white border-[#1C1E1B] hover:bg-black"
    : variant === "danger" ? "bg-white text-[#A32D2D] border-[#FCEBEB] hover:bg-[#FCEBEB]"
    : "bg-white text-[#1C1E1B] border-[#E6E4DD] hover:border-[#c9c7bd]";
  return <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sz} ${v} ${className}`}>{children}</button>;
}

export function Modal({ title, sub, children, onClose, wide }: { title: string; sub?: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 bg-[rgba(20,22,18,.45)] z-[70] flex items-end sm:items-center justify-center sm:p-5" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className={`bg-white w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-md"} rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto`}>
        <div className="w-9 h-1 bg-slate-300 rounded-full mx-auto mb-4 sm:hidden" />
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-semibold">{title}</h3>
            {sub && <p className="text-[12.5px] text-[#6B6F68] mt-0.5">{sub}</p>}
          </div>
          <button onClick={onClose} className="text-[#9BA098] hover:text-[#1C1E1B] p-1 -mr-1"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Drawer({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-[rgba(20,22,18,.35)] z-[60] flex justify-end" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white w-full sm:w-[440px] h-full overflow-y-auto p-5 sm:p-6 shadow-2xl">
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="mb-3">
      <label className="block text-[12px] text-[#6B6F68] font-medium mb-1.5">{label}</label>
      {children}
      {hint && <div className="text-[11.5px] text-[#9BA098] mt-1">{hint}</div>}
    </div>
  );
}

const INPUT = "w-full px-2.5 py-2 border border-[#E6E4DD] rounded-lg text-[13px] outline-none focus:border-[#0F6E56] bg-white";
export function TextInput(p: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={`${INPUT} ${p.className || ""}`} />;
}
export function SelectInput(p: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...p} className={`${INPUT} ${p.className || ""}`} />;
}
export function Row2({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-2.5">{children}</div>;
}
export function FieldsetLabel({ children }: { children: ReactNode }) {
  return <div className="inline-block text-[11px] text-[#04342C] bg-[#E1F5EE] px-2 py-0.5 rounded-md font-semibold mt-3 mb-2">{children}</div>;
}

/* Inline table controls */
export const inlineSelect = "px-1.5 py-1 text-[11.5px] border border-[#E6E4DD] rounded-md bg-white outline-none focus:border-[#0F6E56] max-w-[150px]";
export const inlineInput = "px-2 py-1 text-[11.5px] border border-[#E6E4DD] rounded-md outline-none focus:border-[#0F6E56] w-full min-w-[90px]";

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return <tr><td colSpan={colSpan} className="px-4 py-6 text-[#9BA098] text-[12.5px]">{children}</td></tr>;
}

export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <th className={`text-left px-3.5 py-2.5 text-[11.5px] font-semibold text-[#6B6F68] uppercase tracking-wide border-b border-[#E6E4DD] bg-[#FBFAF7] whitespace-nowrap ${className}`}>{children}</th>;
}
export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`px-3.5 py-2.5 border-b border-[#E6E4DD] text-[13px] align-middle ${className}`}>{children}</td>;
}

export function Scroller({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto"><table className="w-full border-collapse">{children}</table></div>;
}
