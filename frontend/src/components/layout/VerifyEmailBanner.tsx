import { useState } from "react";
import { isAxiosError } from "axios";
import { MailWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/store";
import api from "@/libs/api";

export default function VerifyEmailBanner() {
  const user = useAuth((s) => s.user);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!user || user.emailVerified) return null;

  const resend = async () => {
    setState("sending");
    setError(null);
    try {
      await api.post("/auth/resend-verification");
      setState("sent");
    } catch (err) {
      setError((isAxiosError(err) && err.response?.data?.message) || "Could not send email");
      setState("idle");
    }
  };

  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-2 text-sm text-amber-900">
        <MailWarning className="h-4 w-4 shrink-0" />
        <span className="flex-1">
          Verify <strong>{user.email}</strong> to receive files others share with you. Check your inbox for the link.
          {error && <span className="ml-2 text-red-700">{error}</span>}
        </span>
        {state === "sent" ? (
          <span className="text-amber-700">Verification email sent.</span>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resend}
            disabled={state === "sending"}
            className="h-8 border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
          >
            {state === "sending" ? "Sending…" : "Resend email"}
          </Button>
        )}
      </div>
    </div>
  );
}
