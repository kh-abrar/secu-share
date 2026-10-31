import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { PasswordStrength } from "@/components/common/PasswordStrength";
import { isStrongPassword } from "@/features/auth/password";
import { errorMessage } from "@/libs/api";
import { useAuth } from "@/features/auth/store";
import { takeReturnPath } from "@/features/auth/redirect";

export default function SignupPage() {
  const navigate = useNavigate();
  const { status, register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "authenticated" && !busy) return <Navigate to="/dashboard" replace />;

  const valid =
    name.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && isStrongPassword(password) && password === confirm && understood;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await register(name.trim(), email.trim(), password);
      navigate(takeReturnPath(), { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Sign up failed"));
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Create your account">
      <form onSubmit={submit} className="space-y-4">
        {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="space-y-1">
          <Label htmlFor="name">Name</Label>
          <Input id="name" autoComplete="name" maxLength={80} required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <PasswordStrength password={password} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input id="confirm" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          {confirm && confirm !== password && <p className="text-xs text-red-600">Passwords don't match</p>}
        </div>
        <label className="flex cursor-pointer items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <input type="checkbox" className="mt-0.5" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
          <span>
            I understand my files are encrypted with this password. <strong>If I forget it, my files cannot be recovered</strong>, not even
            by the server operator.
          </span>
        </label>
        <Button type="submit" disabled={!valid || busy} className="h-10 w-full">
          {busy ? "Generating encryption keys…" : "Create account"}
        </Button>
        <p className="text-center text-sm text-neutral-600">
          Already have an account?{" "}
          <Link to="/login" className="underline underline-offset-4">Sign in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
