import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/store";
import { rememberReturnPath } from "@/features/auth/redirect";

export function ProtectedRoute({ children }: PropsWithChildren) {
  const status = useAuth((s) => s.status);
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }
  if (status !== "authenticated") {
    rememberReturnPath(location.pathname + location.search);
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
