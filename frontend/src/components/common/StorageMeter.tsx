import { HardDrive } from "lucide-react";
import { cn, formatFileSize } from "@/libs/utils";

export function StorageMeter({ used, quota, className }: { used: number; quota: number; className?: string }) {
  const pct = quota > 0 ? Math.min(100, (used / quota) * 100) : 0;
  const color = pct >= 90 ? "bg-red-500" : pct >= 75 ? "bg-yellow-500" : "bg-accent";
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium">
          <HardDrive className="h-4 w-4 text-neutral-500" /> Storage
        </span>
        <span className="text-neutral-600">
          {formatFileSize(used)} of {formatFileSize(quota)}
        </span>
      </div>
      <div
        className="h-2 w-full rounded-full bg-neutral-200"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Storage used"
      >
        <div className={cn("h-2 rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
