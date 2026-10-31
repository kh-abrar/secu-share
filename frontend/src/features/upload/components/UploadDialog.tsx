import { useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { errorMessage } from "@/libs/api";
import { formatFileSize } from "@/libs/utils";
import { useUploadFiles } from "@/features/files/hooks";
import { buildShareUrl, createLink, shareWithUser } from "@/features/sharing/hooks";
import { EXPIRY_LABELS, type LinkExpiry } from "@/features/sharing/types";
import { generatePassword, parseEmails } from "@/features/sharing/utils";
import UploadDropZone, { type PickedFile } from "./UploadDropZone";

const MAX_FILE_BYTES = Number(import.meta.env.VITE_MAX_FILE_SIZE) || 100 * 1024 * 1024;

type ShareMode = "none" | "link" | "people";

interface Result {
  uploaded: { name: string; url?: string }[];
  failures: string[];
}

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Destination folder */
  path: string;
}

export default function UploadDialog({ open, onOpenChange, path }: UploadDialogProps) {
  const { toast } = useToast();
  const upload = useUploadFiles();

  const [picked, setPicked] = useState<PickedFile[]>([]);
  const [mode, setMode] = useState<ShareMode>("none");
  const [expiresIn, setExpiresIn] = useState<LinkExpiry>("7d");
  const [password, setPassword] = useState("");
  const [emails, setEmails] = useState("");
  const [progress, setProgress] = useState<{ fraction: number; current: string } | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const busy = progress !== null;
  const tooLarge = picked.filter((p) => p.file.size > MAX_FILE_BYTES);
  const recipients = parseEmails(emails);

  const reset = () => {
    setPicked([]);
    setMode("none");
    setExpiresIn("7d");
    setPassword("");
    setEmails("");
    setProgress(null);
    setResult(null);
  };

  const close = (next: boolean) => {
    if (busy) return;
    onOpenChange(next);
    if (!next) reset();
  };

  const start = async () => {
    setProgress({ fraction: 0, current: "" });
    const failures: string[] = [];
    const uploaded: Result["uploaded"] = [];
    try {
      const res = await upload.mutateAsync({
        items: picked.map((p) => ({ file: p.file, path: `${path}${p.dir}` })),
        onProgress: (done, total, current) => setProgress({ fraction: done / total, current }),
      });
      for (const f of res.failed) failures.push(`${f.item.file.name}: ${errorMessage(f.error)}`);

      for (const { file, fileKey } of res.uploaded) {
        const entry: Result["uploaded"][number] = { name: file.name };
        try {
          if (mode === "link") {
            const link = await createLink(file._id, {
              scope: "public",
              emails: [],
              expiresIn,
              password: password || undefined,
              maxDownloads: null,
            });
            entry.url = await buildShareUrl(link.token, fileKey);
          } else if (mode === "people") {
            for (const email of recipients) {
              try {
                await shareWithUser(file._id, fileKey, email);
              } catch (e) {
                failures.push(`${file.name} → ${errorMessage(e)}`);
              }
            }
          }
        } catch (e) {
          failures.push(`${file.name}: ${errorMessage(e)}`);
        }
        uploaded.push(entry);
      }
    } catch (e) {
      failures.push(errorMessage(e));
    }
    setProgress(null);

    if (mode === "none" && failures.length === 0) {
      toast({ title: `Uploaded ${uploaded.length} file${uploaded.length === 1 ? "" : "s"}` });
      close(false);
    } else {
      setResult({ uploaded, failures: [...new Set(failures)] });
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex max-h-[90vh] w-[95%] flex-col overflow-hidden p-0 sm:max-w-lg">
        <div className="border-b px-6 py-4">
          <DialogHeader className="space-y-1">
            <DialogTitle>{result ? "Upload complete" : "Upload files"}</DialogTitle>
            <DialogDescription>
              {result ? `${result.uploaded.length} uploaded` : `To ${path === "/" ? "My Files" : path}`}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {result ? (
            <ResultView result={result} hasPassword={mode === "link" && !!password} />
          ) : busy ? (
            <div className="space-y-2 py-6">
              <p className="truncate text-sm text-neutral-600">Encrypting and uploading {progress.current}…</p>
              <div className="h-2 w-full rounded-full bg-neutral-200">
                <div className="h-2 rounded-full bg-accent transition-all" style={{ width: `${Math.round(progress.fraction * 100)}%` }} />
              </div>
              <p className="text-right text-xs text-neutral-500">{Math.round(progress.fraction * 100)}%</p>
            </div>
          ) : (
            <>
              <UploadDropZone onPick={(files) => setPicked((prev) => [...prev, ...files])} />

              {picked.length > 0 && (
                <div className="rounded-lg border bg-neutral-50 p-3">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium">{picked.length} file{picked.length === 1 ? "" : "s"}</span>
                    <Button variant="link" size="sm" className="h-auto" onClick={() => setPicked([])}>Clear</Button>
                  </div>
                  <ul className="max-h-32 space-y-1 overflow-y-auto text-xs">
                    {picked.slice(0, 50).map((p, i) => (
                      <li key={`${p.dir}${p.file.name}-${i}`} className="flex justify-between gap-2 rounded bg-white px-2 py-1">
                        <span className={`truncate ${p.file.size > MAX_FILE_BYTES ? "text-red-600" : ""}`}>{p.dir}{p.file.name}</span>
                        <span className="shrink-0 text-neutral-500">{formatFileSize(p.file.size)}</span>
                      </li>
                    ))}
                    {picked.length > 50 && <li className="text-center text-neutral-500">+{picked.length - 50} more</li>}
                  </ul>
                  {tooLarge.length > 0 && (
                    <p className="mt-2 text-xs text-red-600">
                      {tooLarge.length} file{tooLarge.length === 1 ? " is" : "s are"} larger than {formatFileSize(MAX_FILE_BYTES)}. Remove {tooLarge.length === 1 ? "it" : "them"} to continue.
                    </p>
                  )}
                </div>
              )}

              <fieldset className="space-y-2">
                <legend className="mb-2 text-sm font-medium">After uploading</legend>
                {([
                  ["none", "Keep private"],
                  ["link", "Create a share link for each file"],
                  ["people", "Share with specific people"],
                ] as const).map(([value, label]) => (
                  <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input type="radio" name="upload-share" checked={mode === value} onChange={() => setMode(value)} />
                    {label}
                  </label>
                ))}
              </fieldset>

              {mode === "link" && (
                <div className="grid gap-4 rounded-lg border bg-neutral-50 p-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="upload-expiry" className="text-xs text-neutral-600">Expires after</Label>
                    <select
                      id="upload-expiry"
                      className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
                      value={expiresIn}
                      onChange={(e) => setExpiresIn(e.target.value as LinkExpiry)}
                    >
                      {Object.entries(EXPIRY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="upload-password" className="text-xs text-neutral-600">Password (optional)</Label>
                    <div className="flex gap-2">
                      <Input id="upload-password" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} />
                      <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => setPassword(generatePassword())}>
                        Generate
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {mode === "people" && (
                <div className="space-y-1 rounded-lg border bg-neutral-50 p-4">
                  <Label htmlFor="upload-emails" className="text-xs text-neutral-600">Email addresses</Label>
                  <Input id="upload-emails" placeholder="alice@example.com, bob@example.com" value={emails} onChange={(e) => setEmails(e.target.value)} />
                  <p className="text-xs text-neutral-500">Recipients need a verified SecuShare account.</p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="border-t px-6 py-4">
          {result ? (
            <Button onClick={() => close(false)}>Done</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => close(false)} disabled={busy}>Cancel</Button>
              <Button
                onClick={start}
                disabled={
                  busy ||
                  picked.length === 0 ||
                  tooLarge.length > 0 ||
                  (mode === "people" && recipients.length === 0) ||
                  (mode === "link" && password.length > 0 && password.length < 4)
                }
              >
                Upload
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResultView({ result, hasPassword }: { result: Result; hasPassword: boolean }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const withLinks = result.uploaded.filter((u) => u.url);

  const copy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
    } catch {
      toast({ title: "Couldn't copy", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {withLinks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Share links</p>
            {withLinks.length > 1 && (
              <Button variant="outline" size="sm" onClick={() => copy(withLinks.map((u) => `${u.name}: ${u.url}`).join("\n"), "all")}>
                {copied === "all" ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />} Copy all
              </Button>
            )}
          </div>
          {hasPassword && <p className="text-xs text-amber-700">Send the password separately from the links.</p>}
          <ul className="divide-y rounded-lg border">
            {withLinks.map((u) => (
              <li key={u.url} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="truncate">{u.name}</span>
                <Button variant="outline" size="sm" onClick={() => copy(u.url!, u.url!)} aria-label={`Copy link for ${u.name}`}>
                  {copied === u.url ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-neutral-500">You can copy these again later from each file's Share menu.</p>
        </div>
      )}
      {result.failures.length > 0 && (
        <div className="space-y-1 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="flex items-center gap-1 text-sm font-medium text-red-800">
            <X className="h-4 w-4" /> Some things didn't work
          </p>
          <ul className="list-disc space-y-0.5 pl-5 text-xs text-red-700">
            {result.failures.map((f) => <li key={f}>{f}</li>)}
          </ul>
        </div>
      )}
      {withLinks.length === 0 && result.failures.length === 0 && <p className="text-sm text-neutral-600">All files were shared.</p>}
    </div>
  );
}
