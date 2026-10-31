import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/components/layout/AuthLayout";
import api, { errorMessage } from "@/libs/api";
import { useAuth } from "@/features/auth/store";

type Result = { ok: boolean; message: string } | null;

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const signedIn = useAuth((s) => s.status === "authenticated");
  const refreshUser = useAuth((s) => s.refreshUser);
  const [result, setResult] = useState<Result>(null);
  // Tokens are single-use; StrictMode would otherwise submit twice and report failure
  const submitted = useRef(false);

  useEffect(() => {
    if (submitted.current) return;
    submitted.current = true;

    const token = params.get("token") || "";
    // Remove the token from the address bar and history
    window.history.replaceState(null, "", "/verify-email");

    api
      .post<{ email: string }>("/auth/verify-email", { token })
      .then(({ data }) => {
        setResult({ ok: true, message: `${data.email} is verified. You can now receive shared files.` });
        void refreshUser().catch(() => {});
      })
      .catch((err) => setResult({ ok: false, message: errorMessage(err, "Verification failed") }));
  }, [params, refreshUser]);

  return (
    <AuthLayout title={!result ? "Verifying your email…" : result.ok ? "Email verified" : "Verification failed"}>
      {result && (
        <div className="space-y-5 text-center">
          {result.ok ? <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" /> : <XCircle className="mx-auto h-10 w-10 text-red-600" />}
          <p className="text-sm text-neutral-600">{result.message}</p>
          {!result.ok && signedIn && <p className="text-sm text-neutral-600">You can request a new link from Settings.</p>}
          <Button asChild className="h-10 w-full">
            <Link to={signedIn ? "/dashboard" : "/login"}>{signedIn ? "Go to dashboard" : "Sign in"}</Link>
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}
