import Link from "next/link";
import type { ReactNode } from "react";

type RouteCardProps = {
  description: string;
  href: string;
  kicker: string;
  title: string;
  children?: ReactNode;
};

export function RouteCard({ children, description, href, kicker, title }: RouteCardProps) {
  return (
    <Link
      className="group flex min-h-40 flex-col justify-between rounded-[28px] border border-ink/10 bg-white/80 p-6 shadow-panel transition hover:-translate-y-1 hover:border-moss/40"
      href={href}
    >
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-moss">{kicker}</p>
        <div className="space-y-2">
          <h2 className="font-display text-2xl text-ink">{title}</h2>
          <p className="text-sm leading-6 text-ink/70">{description}</p>
        </div>
      </div>
      {children ? <div className="pt-4 text-sm text-ink/70">{children}</div> : null}
    </Link>
  );
}
