import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/libs/utils";
import { PASSWORD_RULES } from "@/features/auth/password";

export function PasswordStrength({ password }: { password: string }) {
  return (
    <ul className="mt-1 grid grid-cols-2 gap-1 text-xs">
      {PASSWORD_RULES.map(([label, test]) => {
        const ok = test(password);
        return (
          <li key={label} className={cn("flex items-center gap-1", ok ? "text-green-700" : "text-neutral-500")}>
            {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
            {label}
          </li>
        );
      })}
    </ul>
  );
}
