import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, MailWarning } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/PageHeader";
import { PasswordStrength } from "@/components/common/PasswordStrength";
import { isStrongPassword } from "@/features/auth/password";
import { useToast } from "@/hooks/use-toast";
import api, { errorMessage } from "@/libs/api";
import { useAuth } from "@/features/auth/store";

export default function Settings() {
  const user = useAuth((s) => s.user)!;
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" />
      <AccountCard name={user.name} email={user.email} verified={user.emailVerified} />
      <ChangePasswordCard />
      <DeleteAccountCard />
    </div>
  );
}

function AccountCard({ name, email, verified }: { name: string; email: string; verified: boolean }) {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  const resend = async () => {
    setSending(true);
    try {
      await api.post("/auth/resend-verification");
      toast({ title: "Verification email sent", description: `Check the inbox for ${email}.` });
    } catch (e) {
      toast({ title: "Couldn't send email", description: errorMessage(e), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="space-y-3 p-6">
      <h2 className="font-semibold">Account</h2>
      <dl className="grid grid-cols-[6rem_1fr] gap-y-2 text-sm">
        <dt className="text-neutral-500">Name</dt>
        <dd>{name}</dd>
        <dt className="text-neutral-500">Email</dt>
        <dd className="flex flex-wrap items-center gap-2">
          {email}
          {verified ? (
            <span className="inline-flex items-center gap-1 text-xs text-green-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-amber-700">
              <MailWarning className="h-3.5 w-3.5" /> Not verified
            </span>
          )}
        </dd>
      </dl>
      {!verified && (
        <Button variant="outline" size="sm" onClick={resend} disabled={sending}>
          {sending ? "Sending…" : "Resend verification email"}
        </Button>
      )}
    </Card>
  );
}

function ChangePasswordCard() {
  const { toast } = useToast();
  const changePassword = useAuth((s) => s.changePassword);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = current && isStrongPassword(next) && next === confirm && next !== current;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      toast({ title: "Password changed" });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <h2 className="font-semibold">Change password</h2>
          <p className="mt-1 text-sm text-neutral-500">Your files stay accessible: your encryption key is re-locked with the new password.</p>
        </div>
        {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="space-y-1">
          <Label htmlFor="pw-current">Current password</Label>
          <Input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pw-new">New password</Label>
          <Input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          <PasswordStrength password={next} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pw-confirm">Confirm new password</Label>
          <Input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          {confirm && next !== confirm && <p className="text-xs text-red-600">Passwords don't match</p>}
        </div>
        <Button type="submit" disabled={!valid || busy}>{busy ? "Changing…" : "Change password"}</Button>
      </form>
    </Card>
  );
}

function DeleteAccountCard() {
  const navigate = useNavigate();
  const deleteAccount = useAuth((s) => s.deleteAccount);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(password);
      navigate("/login", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Card className="border-red-200 p-6">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <h2 className="font-semibold text-red-700">Delete account</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Permanently deletes your account, all your files and every share link. Files others shared with you are not affected.
          </p>
        </div>
        {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="space-y-1">
          <Label htmlFor="del-password">Password</Label>
          <Input id="del-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="del-confirm">Type DELETE to confirm</Label>
          <Input id="del-confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
        </div>
        <Button type="submit" variant="destructive" disabled={!password || confirmText !== "DELETE" || busy}>
          {busy ? "Deleting…" : "Delete my account"}
        </Button>
      </form>
    </Card>
  );
}
