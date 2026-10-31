import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PromptDialogProps {
  open: boolean;
  title: string;
  label: string;
  initialValue?: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: (value: string) => void;
  onOpenChange: (open: boolean) => void;
}

/** Single text field dialog (new folder, rename). */
export function PromptDialog({ open, title, label, initialValue = "", confirmLabel, busy, onConfirm, onOpenChange }: PromptDialogProps) {
  const [value, setValue] = useState(initialValue);
  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  const trimmed = value.trim();
  const invalid = !trimmed || /[/\\]/.test(trimmed) || trimmed === "." || trimmed === ".." || trimmed.length > 255;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!invalid) onConfirm(trimmed);
          }}
          className="space-y-4"
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <Input aria-label={label} placeholder={label} value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
          {trimmed && invalid && <p className="text-xs text-red-600">Names can't contain / or \</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={invalid || busy || trimmed === initialValue}>{confirmLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

export function ConfirmDialog({ open, title, description, confirmLabel, destructive, busy, onConfirm, onOpenChange }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button variant={destructive ? "destructive" : "default"} onClick={onConfirm} disabled={busy}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
