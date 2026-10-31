import { Link } from "react-router-dom";
import { FileText, FolderOpen, Share2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { StorageMeter } from "@/components/common/StorageMeter";
import { useToast } from "@/hooks/use-toast";
import { errorMessage } from "@/libs/api";
import { formatDate, formatFileSize } from "@/libs/utils";
import { useAuth } from "@/features/auth/store";
import { useDownloadFile, useFileStats, useRecentFiles } from "@/features/files/hooks";
import { ImageThumbnail } from "@/features/files/components/ImageThumbnail";
import type { FileItem } from "@/features/files/types";

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <Card className="flex items-center justify-between p-5">
      <div>
        <p className="text-sm text-neutral-500">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-accent">{icon}</div>
    </Card>
  );
}

export default function DashboardHome() {
  const user = useAuth((s) => s.user);
  const { toast } = useToast();
  const stats = useFileStats();
  const recent = useRecentFiles(6);
  const download = useDownloadFile();

  const open = async (file: FileItem) => {
    try {
      await download(file);
    } catch (e) {
      toast({ title: "Download failed", description: errorMessage(e), variant: "destructive" });
    }
  };

  const value = (n?: number) => (stats.data ? n ?? 0 : "–");

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome${user?.name ? `, ${user.name}` : ""}`}
        description="Everything here is encrypted on your device before it is uploaded."
        action={
          <Button asChild>
            <Link to="/files">
              <FolderOpen className="mr-2 h-4 w-4" /> Open My Files
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Stat icon={<FileText className="h-5 w-5" />} label="Files" value={value(stats.data?.files)} />
        <Stat icon={<Share2 className="h-5 w-5" />} label="Shared files" value={value(stats.data?.sharedFiles)} />
        <Card className="p-5">
          {stats.data ? <StorageMeter used={stats.data.used} quota={stats.data.quota} /> : <p className="text-sm text-neutral-500">Storage</p>}
        </Card>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Recent uploads</h2>
        {recent.isLoading ? (
          <p className="text-sm text-neutral-500">Loading…</p>
        ) : !recent.data?.length ? (
          <Card className="p-8 text-center">
            <p className="font-medium">No files yet</p>
            <p className="mt-1 text-sm text-neutral-500">
              Go to <Link className="text-accent underline" to="/files">My Files</Link> to upload your first file.
            </p>
          </Card>
        ) : (
          <Card className="divide-y">
            {recent.data.map((f) => (
              <button
                key={f._id}
                type="button"
                onClick={() => open(f)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50"
              >
                <ImageThumbnail file={f} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f.name}</p>
                  <p className="truncate text-xs text-neutral-500">{f.path === "/" ? "My Files" : f.path}</p>
                </div>
                <div className="shrink-0 text-right text-xs text-neutral-500">
                  <p>{formatFileSize(f.size)}</p>
                  <p>{formatDate(f.createdAt)}</p>
                </div>
              </button>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
