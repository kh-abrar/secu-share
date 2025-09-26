import { Label } from "@/components/ui/label";
import type { SelectHTMLAttributes } from "react";

/**
 * UI select for link expiry and a helper to convert value -> seconds (for API).
 * Values: "1h" | "24h" | "7d" | "30d" | "never"
 */

export type LinkExpiryValue = "1h" | "24h" | "7d" | "30d" | "never";

export function expiryToSeconds(v: LinkExpiryValue | string): number | null {
  if (!v || v === "never") return null;
  const n = parseInt(v);
  if (Number.isNaN(n)) return null;
  if (v.endsWith("h")) return n * 3600;
  if (v.endsWith("d")) return n * 24 * 3600;
  return null;
}

type Props = {
  id?: string;
  label?: string;
  value: LinkExpiryValue;
  onChange: (v: LinkExpiryValue) => void;
  selectProps?: Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange" | "id">;
};

export default function LinkExpirySelect({ id = "link-expiry", label = "Link Expiry", value, onChange, selectProps }: Props) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className="w-full rounded-md border border-neutral-300 p-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value as LinkExpiryValue)}
        {...selectProps}
      >
        <option value="1h">1 hour</option>
        <option value="24h">24 hours</option>
        <option value="7d">7 days</option>
        <option value="30d">30 days</option>
        <option value="never">Never</option>
      </select>
    </div>
  );
}
