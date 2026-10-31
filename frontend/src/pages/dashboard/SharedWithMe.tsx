import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, MailWarning, Search, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConfirmDialog } from "@/components/common/PromptDialog";
import { useToast } from "@/hooks/use-toast";
import api, { errorMessage } from "@/libs/api";
import { formatDate, formatFileSize } from "@/libs/utils";
import { useAuth } from "@/features/auth/store";
import { fileKeys, useDownloadFile, useRemoveSharedFile, useSharedWithMe } from "@/features/files/hooks";
import { ImageThumbnail } from "@/features/files/components/ImageThumbnail";
import type { SharedFile } from "@/features/files/types";

export default function SharedWithMe() {
  const verified = useAuth((s) => !!s.user?.emailVerified);
  const { toast } = useToast();
  const qc = useQueryClient();
  const shared = useSharedWithMe(verified);
  const remove = useRemoveSharedFile();
  const download = useDownloadFile();
  const [query, setQuery] = useState("");
  const [removing, setRemoving] = useState<SharedFile | null>(null);

  // Opening this page clears the "new" badge in the navigation
  useEffect(() => {
    if (!verified) return;
    api.post("/shared-with-me/mark-seen").then(() => qc.invalidateQueries({ queryKey: fileKeys.unseen }), () => {});
  }, [verified, qc]);

  const files = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (shared.data ?? []).filter(
      (f) => !q || f.name.toLowerCase().includes(q) || f.owner.name.toLowerCase().includes(q) || f.owner.email.includes(q)
    );
  }, [shared.data, query]);

  const open = async (file: SharedFile) => {
    try {
      await download(file);
    } catch (e) {
      toast({ title: "Download failed", description: errorMessage(e), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Shared with me" description="Files other people shared with your account." />

      {!verified ? (
        <Card className="flex items-start gap-3 p-6">
          <MailWarning className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium">Verify your email address to receive files</p>
            <p className="mt-1 text-sm text-neutral-600">
              Files are only shared with accounts that have proven they own their email address. Use the link we emailed you, or
              resend it from the banner above.
            </p>
          </div>
        </Card>
      ) : (
        <>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input className="pl-9" placeholder="Search by file or person" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search shared files" />
          </div>

          {shared.isLoading ? (
            <p className="py-12 text-center text-sm text-neutral-500">Loading…</p>
          ) : shared.error ? (
            <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{errorMessage(shared.error)}</p>
          ) : files.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="font-medium">{query ? "No matches" : "Nothing shared with you yet"}</p>
              {!query && <p className="mt-1 text-sm text-neutral-500">When someone shares a file with your email, it shows up here.</p>}
            </Card>
          ) : (
            <Card className="divide-y">
              {files.map((f) => (
                <div key={f.shareId} className="flex items-center gap-3 px-4 py-3">
                  <ImageThumbnail file={f} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm font-medium">
                      <span className="truncate">{f.name}</span>
                      {!f.seen && <Badge>New</Badge>}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      From {f.owner.name} ({f.owner.email}) · {formatFileSize(f.size)} · {formatDate(f.sharedAt)}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => open(f)}>
                    <Download className="mr-1 h-4 w-4" /> Download
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setRemoving(f)} aria-label={`Remove ${f.name} from this list`}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </Card>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!removing}
        title="Remove from your list?"
        description={removing ? `"${removing.name}" will disappear from Shared with me. ${removing.owner.name}'s copy is not affected.` : undefined}
        confirmLabel="Remove"
        busy={remove.isPending}
        onOpenChange={(o) => !o && setRemoving(null)}
        onConfirm={() =>
          removing &&
          remove.mutate(removing.shareId, {
            onSuccess: () => setRemoving(null),
            onError: (e) => toast({ title: "Couldn't remove", description: errorMessage(e), variant: "destructive" }),
          })
        }
      />
    </div>
  );
}
