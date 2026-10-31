import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { errorMessage } from "@/libs/api";
import { useAuth } from "@/features/auth/store";
import { takeReturnPath } from "@/features/auth/redirect";

export default function LoginPage() {
  const navigate = useNavigate();
  const { status, login, notice, clearNotice } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "authenticated" && !busy) return <Navigate to="/dashboard" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    clearNotice();
    try {
      await login(email.trim(), password);
      navigate(takeReturnPath(), { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Sign in failed"));
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Sign in to SecuShare">
      <form onSubmit={submit} className="space-y-4">
        {(error || notice) && (
          <div role="alert" className={`rounded-md border p-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
            {error || notice}
          </div>
        )}
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute inset-y-0 right-2 my-auto inline-flex items-center p-1 text-neutral-500 hover:text-black"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <Button type="submit" disabled={busy || !email || !password} className="h-10 w-full">
          {busy ? "Unlocking your keys…" : "Sign in"}
        </Button>
        <p className="text-center text-sm text-neutral-600">
          No account?{" "}
          <Link to="/signup" className="underline underline-offset-4">Create one</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
