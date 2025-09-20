import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/app/providers/auth-provider";
import { CloudLogo, CloudBackdrop } from "@/components/branding";


const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Min 6 characters"),
});
type FormValues = z.infer<typeof schema>;




/* ---------- page ---------- */
export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    await login({ email: values.email, password: values.password });
    navigate("/app");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-neutral-50">
      <CloudBackdrop />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
        <div className="w-full max-w-md">
          <CloudLogo />

          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h1 className="mb-5 text-xl font-semibold tracking-tight">
              Log in to SecureShare
            </h1>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {/* Email */}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Password + show/hide */}
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    {...register("password")}
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
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <Button disabled={isSubmitting} className="h-10 w-full">
                {isSubmitting ? "Continuing..." : "Continue"}
              </Button>

              <p className="text-center text-sm text-neutral-600">
                No account?{" "}
                <Link to="/signup" className="underline underline-offset-4">
                  Create one
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
