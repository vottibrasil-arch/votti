import type { ReactNode } from "react";

export function SettingsToggle({
  icon,
  label,
  sub,
  value,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  sub: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="w-full glass rounded-2xl p-3.5 flex items-center gap-3 text-left"
    >
      <div className="size-10 rounded-xl bg-surface-2 grid place-items-center text-gold shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-xs text-muted-foreground truncate">{sub}</div>
      </div>
      <div className={`relative w-11 h-6 rounded-full transition shrink-0 ${value ? "bg-primary" : "bg-surface-2"}`}>
        <div
          className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition ${
            value ? "left-[1.375rem]" : "left-0.5"
          }`}
        />
      </div>
    </button>
  );
}

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block glass rounded-2xl p-3.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}
