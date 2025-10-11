import { PageHeader } from "@/components/layout/PageHeader";
import { useSharedWithMe, useDownloadFile } from "@/features/files/hooks/useFilesByPath";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Download, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SharedWithMe() {
  const { data: files, isLoading, error } = useSharedWithMe();
  const downloadMutation = useDownloadFile();
  const { toast } = useToast();

  const downloadFile = async (fileId: string, filename: string) => {
    try {
      await downloadMutation.mutateAsync({ fileId, filename });
      toast({ title: "✅ Download started" });
    } catch (error) {
      toast({ title: "❌ Download failed", variant: "destructive" });
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <PageHeader
          title="Shared With Me"
          description="Files that others have shared with you"
        />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900 mx-auto mb-2"></div>
            <p className="text-sm text-neutral-600">Loading shared files...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <PageHeader
          title="Shared With Me"
          description="Files that others have shared with you"
        />
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm text-red-600">Failed to load shared files</p>
        </div>
      </div>
    );
  }

  if (!files || files.length === 0) {
    return (
      <div className="container mx-auto py-6">
        <PageHeader
          title="Shared With Me"
          description="Files that others have shared with you"
        />
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-12 text-center">
          <User className="h-12 w-12 text-neutral-400 mx-auto mb-3" />
          <p className="text-neutral-600">No files shared with you yet</p>
          <p className="text-sm text-neutral-500 mt-1">Files shared by others will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="Shared With Me"
        description="Files that others have shared with you"
      />

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-2 font-medium">File</th>
              <th className="px-4 py-2 font-medium">Size</th>
              <th className="px-4 py-2 font-medium">Shared By</th>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.filter(f => f.type === 'file').map((file: any) => (
              <tr key={file._id} className="border-t hover:bg-neutral-50">
                <td className="px-4 py-3">{file.name || file.originalName}</td>
                <td className="px-4 py-3">{formatSize(file.size)}</td>
                <td className="px-4 py-3">
                  {file.ownerEmail || file.ownerName || 'Unknown'}
                </td>
                <td className="px-4 py-3">{formatDate(file.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-neutral-500 hover:text-black"
                        aria-label="Open actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => downloadFile(file._id, file.name || file.originalName)}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
