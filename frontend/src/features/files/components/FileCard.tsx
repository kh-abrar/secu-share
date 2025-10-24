import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { File as FileIcon, Folder as FolderIcon, Download, Trash2, Share2, Copy, X } from "lucide-react";
import LinkExpirySelect, { type LinkExpiryValue, expiryToSeconds } from "@/features/sharing/components/LinkExpirySelect";
import api from "@/libs/api";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

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

export default function FileCard({ file, onOpenFolder, onDeleted }: Props) {
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createdAt = useMemo(() => (file.createdAt ? new Date(file.createdAt) : null), [file.createdAt]);

  const onDownload = async () => {
    if (isFolder) return;
    try {
      const response = await api.get(`/files/download/${file._id}`);
      if (response.data.downloadUrl) {
        window.location.href = response.data.downloadUrl;
        toast({ title: "✅ Download started" });
      }
    } catch (e: any) {
      toast({ 
        title: "❌ Download failed",
        description: e?.response?.data?.message || e?.message || "Download failed",
        variant: "destructive" 
      });
    }
  };

  const onDelete = async () => {
    if (!confirm(`Delete "${file.name}"?`)) return;
    try {
      await api.delete(`/files/${file._id}`);
      onDeleted?.(file._id);
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['files', 'all'] });
      toast({ title: "✅ File deleted successfully" });
    } catch (e: any) {
      toast({ 
        title: "❌ Delete failed",
        description: e?.response?.data?.message || e?.message || "Delete failed",
        variant: "destructive" 
      });
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
        throw new Error("Folder links not implemented. Select a file.");
      }

      const hasPassword = password.trim().length > 0;
      const endpoint = hasPassword ? "/share/protected" : "/share/create";
      const body: any = {
        fileId: file._id,
        scope,
        expiresIn: expiryToSeconds(expiry) ?? undefined,
        maxAccess: null,
      };
      if (scope === "restricted") body.emails = emails;
      if (hasPassword) body.password = password;

      const response = await api.post(endpoint, body);
      setShareUrl(response.data.shareUrl || response.data.url || null);
      
      // Invalidate files queries to refresh dashboard statistics
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['files', 'all'] });
      
      toast({ 
        title: "✅ Share link created",
        description: "Link copied to the input below"
      });
    } catch (e: any) {
      const errorMsg = e?.response?.data?.message || e?.message || "Failed to create link";
      setError(errorMsg);
      toast({ 
        title: "❌ Share link failed",
        description: errorMsg,
        variant: "destructive" 
      });
    } finally {
      setCreating(false);
    }
  };

  const copyShare = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "✅ Link copied to clipboard" });
    } catch {
      toast({ title: "❌ Copy failed", variant: "destructive" });
    }
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 hover:border-neutral-300 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="shrink-0">
          {isFolder ? (
            <FolderIcon className="h-6 w-6 text-blue-500" />
          ) : (
            <FileIcon className="h-6 w-6 text-neutral-500" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div
            className={`truncate font-medium text-sm ${isFolder ? "cursor-pointer hover:underline hover:text-blue-600" : ""}`}
            onClick={() => isFolder && onOpenFolder?.(`${file.path}${file.name}/`)}
            title={isFolder ? `${file.path}${file.name}/` : file.name}
          >
            {file.name}
          </div>
          <div className="text-xs text-neutral-500">
            {isFolder ? "Folder" : `${file.mimetype || "file"} • ${formatBytes(file.size)}`}
            {createdAt ? ` • ${createdAt.toLocaleDateString()}` : null}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0 ml-3">
        {!isFolder && (
          <Button size="sm" variant="outline" onClick={onDownload} className="h-7 px-2 text-xs">
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
        )}

        {!isFolder && (
          <Dialog open={shareOpen} onOpenChange={setShareOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-accent text-white hover:opacity-90 h-7 px-2 text-xs">
                <Share2 className="h-3 w-3 mr-1" />
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

        <Button size="sm" variant="outline" onClick={onDelete} className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50">
          <Trash2 className="h-3 w-3 mr-1" />
          Delete
        </Button>
      </div>
    </div>
  );
}
