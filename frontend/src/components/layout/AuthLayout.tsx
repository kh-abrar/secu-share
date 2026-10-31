import type { PropsWithChildren } from "react";
import { CloudBackdrop, CloudLogo } from "@/components/branding";

export function AuthLayout({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-neutral-50">
      <CloudBackdrop />
      <main className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <CloudLogo />
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h1 className="mb-5 text-xl font-semibold tracking-tight">{title}</h1>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
