import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/logo";
import { AppShell } from "@/components/app/app-shell";
import { SecurityBadge } from "@/components/votti/security-badge";

type AuthScreenProps = {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthScreen({ title, children, footer }: AuthScreenProps) {
  return (
    <AppShell feed={false}>
      <div className="votti-auth flex-1 flex flex-col px-5 py-8 max-w-md mx-auto w-full">
        <Link to="/" className="votti-auth__logo mx-auto">
          <Logo size="hero" className="votti-hero__logo" />
        </Link>
        <div className="votti-auth__trust">
          <SecurityBadge />
        </div>
        <h1 className="votti-auth__title">{title}</h1>
        <div className="votti-auth__card animate-rise">{children}</div>
        {footer ? <div className="votti-auth__footer">{footer}</div> : null}
      </div>
    </AppShell>
  );
}

export function AuthField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="votti-field">
      <span className="votti-field__label">{label}</span>
      {children}
    </label>
  );
}

export function AuthInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="votti-field__input" {...props} />;
}

export function AuthButton({
  children,
  variant = "primary",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "google" }) {
  return (
    <button
      type={type}
      className={variant === "google" ? "votti-auth-btn votti-auth-btn--google" : "votti-auth-btn"}
      {...props}
    >
      {children}
    </button>
  );
}

export function AuthDivider() {
  return (
    <div className="votti-auth-divider">
      <span>ou</span>
    </div>
  );
}
