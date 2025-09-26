import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { File as FileIcon, Folder as FolderIcon, Download, Trash2, Share2, Copy, X } from "lucide-react";
import LinkExpirySelect, { type LinkExpiryValue, expiryToSeconds } from "@/features/sharing/components/LinkExpirySelect";

type FileDoc = {
  _id: string;
  type: "file" | "folder";
  name: string;
  path: string;                // parent dir ("/A/B/")
  filename?: string;           // S3 key (files only)
  mimetype?: string;
  size?: number;
  createdAt?: string;
};

type Props = {
  file: FileDoc;
  onOpenFolder?: (path: string) => void;         // when folder is clicked
  onDeleted?: (id: string) => void;              // after delete success
  token?: string;                                 // optional JWT for Authorization header
};

function formatBytes(n?: number) {
  if (!n && n !== 0) return "";
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let u = -1;
  let v = n;
  do { v /= 1024; u++; } while (v >= 1024 && u < units.length - 1);
  return `${v.toFixed(1)} ${units[u]}`;
}

export default function FileCard({ file, onOpenFolder, onDeleted, token }: Props) {
  const isFolder = file.type === "folder";
  const [shareOpen, setShareOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [scope, setScope] = useState<"public" | "restricted">("public");
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [password, setPassword] = useState("");
  const [expiry, setExpiry] = useState<LinkExpiryValue>("7d");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createdAt = useMemo(() => (file.createdAt ? new Date(file.createdAt) : null), [file.createdAt]);

  const authHeader = token ? { Authorization: `Bearer ${token}` } : undefined;

  const onDownload = async () => {
    if (isFolder) return; // not implemented here
    try {
      const res = await fetch(`/api/files/download/${file._id}`, {
        method: "GET",
        headers: { ...authHeader },
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      if (json.downloadUrl) {
        window.location.href = json.downloadUrl;
      }
    } catch (e: any) {
      alert(e?.message || "Download failed");
    }
  };

  const onDelete = async () => {
    if (!confirm(`Delete "${file.name}"?`)) return;
    try {
      const res = await fetch(`/api/files/${file._id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...authHeader },
      });
      if (!res.ok) throw new Error(await res.text());
      onDeleted?.(file._id);
    } catch (e: any) {
      alert(e?.message || "Delete failed");
    }
  };

  const addEmail = () => {
    const m = emailInput.trim().toLowerCase();
    if (!m) return;
    if (!emails.includes(m)) setEmails((prev) => [...prev, m]);
    setEmailInput("");
  };
  const removeEmail = (m: string) => setEmails((prev) => prev.filter((x) => x !== m));

  const createShare = async () => {
    setCreating(true);
    setError(null);
    setShareUrl(null);
    try {
      if (isFolder) {
        // For simplicity we only share files here. You can extend this by creating a "folder link"
        // that points to the folder's File doc (type: "folder") and returns a listing in the backend.
        throw new Error("Folder links not implemented in this card. Select a file.");
      }

      const hasPassword = password.trim().length > 0;
      const url = hasPassword ? "/api/share/protected" : "/api/share/create";
      const body: any = {
        fileId: file._id,
        scope,
        expiresIn: expiryToSeconds(expiry) ?? undefined,
        maxAccess: null,
      };
      if (scope === "restricted") body.emails = emails;
      if (hasPassword) body.password = password;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setShareUrl(json.shareUrl || null);
    } catch (e: any) {
      setError(e?.message || "Failed to create link");
    } finally {
      setCreating(false);
    }
  };

  const copyShare = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      // optional toast
    } catch {}
  };

  return (
    <div className="flex items-center justify-between rounded-2xl border p-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0">
          {isFolder ? <FolderIcon className="h-6 w-6" /> : <FileIcon className="h-6 w-6" />}
        </div>
        <div className="min-w-0">
          <div
            className={`truncate font-medium ${isFolder ? "cursor-pointer hover:underline" : ""}`}
            onClick={() => isFolder && onOpenFolder?.(`${file.path}${file.name}/`)}
            title={isFolder ? `${file.path}${file.name}/` : file.name}
          >
            {file.name}
          </div>
          <div className="text-xs text-neutral-500">
            {isFolder ? "Folder" : `${file.mimetype || "file"} • ${formatBytes(file.size)}`}
            {createdAt ? ` • ${createdAt.toLocaleString()}` : null}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!isFolder && (
          <Button size="sm" variant="outline" onClick={onDownload}>
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
        )}

        {!isFolder && (
          <Dialog open={shareOpen} onOpenChange={setShareOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-accent text-white hover:opacity-90">
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Share “{file.name}”</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Scope</Label>
                  <div className="flex flex-col gap-2 text-sm">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="scope"
                        value="public"
                        checked={scope === "public"}
                        onChange={() => setScope("public")}
                      />
                      Public link
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="scope"
                        value="restricted"
                        checked={scope === "restricted"}
                        onChange={() => setScope("restricted")}
                      />
                      Restricted (specific emails)
                    </label>
                  </div>
                </div>

                {scope === "restricted" && (
                  <div className="space-y-2">
                    <Label>Allowed Emails</Label>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="user@example.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addEmail();
                          }
                        }}
                      />
                      <Button type="button" variant="outline" onClick={addEmail}>
                        Add
                      </Button>
                    </div>
                    {emails.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-2">
                        {emails.map((m) => (
                          <span key={m} className="inline-flex items-center gap-1 rounded-md border bg-neutral-50 px-2 py-1 text-xs">
                            {m}
                            <button type="button" onClick={() => removeEmail(m)} className="text-neutral-500 hover:text-red-600">
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <LinkExpirySelect value={expiry} onChange={setExpiry} />

                <div className="space-y-2">
                  <Label htmlFor="share-pass">Password (optional)</Label>
                  <Input
                    id="share-pass"
                    type="password"
                    placeholder="Set a link password (optional)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex items-center gap-2">
                  <Button onClick={createShare} disabled={creating} className="bg-accent text-white hover:opacity-90">
                    {creating ? "Creating…" : "Create link"}
                  </Button>
                  {shareUrl && (
                    <Button type="button" variant="outline" onClick={copyShare}>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  )}
                </div>

                {shareUrl && (
                  <div className="rounded-md border p-2 text-xs break-all">
                    {shareUrl}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        <Button size="sm" variant="outline" onClick={onDelete}>
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      </div>
    </div>
  );
}
