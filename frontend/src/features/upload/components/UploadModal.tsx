// features/upload/components/UploadModal.tsx
import { useState } from "react";
import { Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import UploadDropzone from "@/features/upload/components/UploadDropZone";

type ShareType = "public" | "private";

export default function UploadModal() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<File[]>([]);
  const [shareType, setShareType] = useState<ShareType>("public");
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [expiry, setExpiry] = useState<"24h" | "7d" | "never">("7d");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddEmail = () => {
    const mail = emailInput.trim().toLowerCase();
    if (!mail) return;
    if (!emails.includes(mail)) setEmails((prev) => [...prev, mail]);
    setEmailInput("");
  };
  const handleRemoveEmail = (target: string) => setEmails((prev) => prev.filter((m) => m !== target));

  const resetAll = () => {
    setSelected([]); setEmails([]); setShareType("public"); setEmailInput("");
    setExpiry("7d"); setBusy(false); setError(null);
  };

  const handleUpload = async () => {
    if (!selected.length) return;
    setBusy(true); setError(null);
    try {
      const form = new FormData();
      for (const f of selected) {
        form.append("files", f);
        const rel = (f as any).webkitRelativePath || f.name;
        form.append("relativePaths", rel);
      }
      form.append("expiry", expiry);
      form.append("shareType", shareType);
      if (shareType === "private") form.append("emails", JSON.stringify(emails));

      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);

      setOpen(false); resetAll();
    } catch (e: any) {
      setError(e?.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetAll(); }}>
      <DialogTrigger asChild>
        <Button className="bg-accent text-white hover:opacity-90" type="button">
          <Upload className="mr-2 h-4 w-4" /> Upload
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Upload Files / Folders</DialogTitle></DialogHeader>

        <UploadDropzone onSelect={setSelected} accept={["application/pdf","image/png","image/jpeg"]} maxFiles={2000} maxSizeMB={512} className="mt-2" />

        {selected.length > 0 && (
          <div className="mt-3 max-h-40 overflow-auto rounded-md border p-2">
            <p className="mb-2 text-sm text-neutral-600">{selected.length} file(s) selected</p>
            <div className="flex flex-wrap gap-2">
              {selected.slice(0, 30).map((f) => {
                const rel = (f as any).webkitRelativePath || f.name;
                return (
                  <span key={rel + f.size + f.lastModified} title={rel} className="rounded-md border bg-neutral-50 px-2 py-1 text-xs">
                    {rel}
                  </span>
                );
              })}
              {selected.length > 30 && <span className="text-xs text-neutral-500">+{selected.length - 30} more…</span>}
            </div>
          </div>
        )}

        <div className="mt-6 space-y-2">
          <Label htmlFor="expiry">Link Expiry</Label>
          <select id="expiry" className="w-full rounded-md border border-neutral-300 p-2 text-sm" value={expiry} onChange={(e) => setExpiry(e.target.value as any)}>
            <option value="24h">24 hours</option>
            <option value="7d">7 days</option>
            <option value="never">Never</option>
          </select>
        </div>

        <div className="mt-6 space-y-2">
          <Label>Share with</Label>
          <div className="flex flex-col space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="shareType" value="public" checked={shareType === "public"} onChange={() => setShareType("public")} /> Public link
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="shareType" value="private" checked={shareType === "private"} onChange={() => setShareType("private")} /> Specific users
            </label>
          </div>
        </div>

        {shareType === "private" && (
          <div className="mt-4 space-y-2">
            <Label htmlFor="emails">Allowed Emails</Label>
            <div className="flex gap-2">
              <Input id="emails" type="email" value={emailInput} placeholder="user@example.com"
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddEmail(); } }} />
              <Button type="button" onClick={handleAddEmail}>Add</Button>
            </div>
            {emails.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {emails.map((mail) => (
                  <div key={mail} className="flex items-center gap-1 rounded-md border bg-neutral-50 px-2 py-1 text-sm">
                    <span className="truncate max-w-[180px]">{mail}</span>
                    <button type="button" className="text-neutral-500 hover:text-red-600" onClick={() => handleRemoveEmail(mail)}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => { setOpen(false); resetAll(); }} disabled={busy}>Cancel</Button>
          <Button className="bg-accent text-white hover:opacity-90" onClick={handleUpload} disabled={busy || selected.length === 0} type="button">
            {busy ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
