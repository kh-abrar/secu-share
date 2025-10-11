import { useMemo, useState, useEffect } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/providers/auth-provider";
import { CloudLogo, CloudBackdrop } from "@/components/branding";


const inputCls =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20";



export default function SignupPage() {
  const { signup, loading, error, clearError } = useAuth();
  const navigate = useNavigate();

  // Clear error when component unmounts
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // password complexity (8+, upper, lower, digit, special)
  const strong = useMemo(() => {
    const len = pw.length >= 8;
    const upper = /[A-Z]/.test(pw);
    const lower = /[a-z]/.test(pw);
    const digit = /\d/.test(pw);
    const special = /[^A-Za-z0-9]/.test(pw);
    return len && upper && lower && digit && special;
  }, [pw]);

  const match = useMemo(() => pw.length > 0 && pw === confirm, [pw, confirm]);

  const canSubmit = strong && match && /\S+@\S+\.\S+/.test(email) && name.trim().length > 0;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await signup({ email, password: pw, name });
      navigate("/dashboard");
    } catch (error) {
      // Error is handled by the auth store and displayed in the form
      console.error("Signup failed:", error);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-neutral-50">
      <CloudBackdrop />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
        <div className="w-full max-w-md">
          <CloudLogo />

          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h1 className="mb-5 text-xl font-semibold tracking-tight">
              Create your SecureShare Account
            </h1>

            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              {/* Error message */}
              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              
              {/* Name */}
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-sm font-medium">Name</label>
                <input
                  id="name"
                  className={inputCls}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <input
                  id="email"
                  type="email"
                  className={inputCls}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPw ? "text" : "password"}
                    className={inputCls}
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    autoComplete="new-password"
                    aria-describedby="pw-status"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute inset-y-0 right-2 my-auto inline-flex items-center rounded p-1 text-neutral-500 hover:text-black"
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Confirm */}
                <div className="relative">
                  <input
                    id="confirm"
                    type={showConfirm ? "text" : "password"}
                    className={inputCls}
                    placeholder="Confirm password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    aria-describedby="pw-status"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((s) => !s)}
                    className="absolute inset-y-0 right-2 my-auto inline-flex items-center rounded p-1 text-neutral-500 hover:text-black"
                    aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Status block */}
                <div id="pw-status" className="rounded-lg border bg-neutral-50 p-3 text-sm">
                  <div className={`flex items-center gap-2 ${strong ? "text-green-600" : "text-neutral-600"}`}>
                    {strong ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5 text-neutral-400" />}
                    Min 8 chars, include A–Z, a–z, 0–9, and a special
                  </div>
                  <div className={`mt-1 flex items-center gap-2 ${match ? "text-green-600" : "text-neutral-600"}`}>
                    {match ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5 text-neutral-400" />}
                    Passwords match
                  </div>
                </div>
              </div>

              <Button className="h-10 w-full" disabled={!canSubmit || loading}>
                {loading ? "Creating..." : "Create account"}
              </Button>

              <p className="text-center text-sm text-neutral-600">
                Already have an account?{" "}
                <Link className="underline underline-offset-4" to="/login">
                  Log in
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
