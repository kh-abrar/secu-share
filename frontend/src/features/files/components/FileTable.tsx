import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Share2, Download, Trash2, Copy } from "lucide-react"
import ShareDialog from "@/features/sharing/components/ShareDialog"
import { useFilesByPath, useDeleteFile, useDownloadFile } from "@/features/files/hooks/useFilesByPath"
import type { FileItem } from "@/features/files/types"
import { useToast } from "@/hooks/use-toast"

export default function FileTable() {
  const [shareOpen, setShareOpen] = useState(false)
  const [activeFile, setActiveFile] = useState<FileItem | null>(null)
  const { data: files, isLoading, error } = useFilesByPath('/')
  const deleteMutation = useDeleteFile()
  const downloadMutation = useDownloadFile()
  const { toast } = useToast()

  const openShare = (file: FileItem) => {
    setActiveFile(file)
    setShareOpen(true)
  }

  const copyLink = async (file: FileItem) => {
    const link = `${window.location.origin}/s/${file._id}`
    try {
      await navigator.clipboard.writeText(link)
      toast({ title: "Copied", description: "Link copied to clipboard." })
    } catch {
      toast({ title: "Copy failed", variant: "destructive" })
    }
  }

  const downloadFile = async (file: FileItem) => {
    try {
      await downloadMutation.mutateAsync({ fileId: file._id, filename: file.name })
      toast({ title: "Download started" })
    } catch (error) {
      toast({ title: "Download failed", variant: "destructive" })
    }
  }

  const deleteFile = async (file: FileItem) => {
    try {
      await deleteMutation.mutateAsync(file._id)
      toast({ title: "File deleted successfully" })
    } catch (error) {
      toast({ title: "Delete failed", variant: "destructive" })
    }
  }

  const formatSize = (bytes?: number) => {
    if (!bytes) return 'N/A'
    const mb = bytes / (1024 * 1024)
    if (mb >= 1) return `${mb.toFixed(2)} MB`
    return `${(bytes / 1024).toFixed(2)} KB`
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900 mx-auto mb-2"></div>
          <p className="text-sm text-neutral-600">Loading files...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
        <p className="text-sm text-red-600">Failed to load files</p>
      </div>
    )
  }

  if (!files || files.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-12 text-center">
        <p className="text-neutral-600">No files uploaded yet</p>
        <p className="text-sm text-neutral-500 mt-1">Click "Upload" to add your first file</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-2 font-medium">File</th>
              <th className="px-4 py-2 font-medium">Size</th>
              <th className="px-4 py-2 font-medium">Uploaded</th>
              <th className="px-4 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.filter(f => f.type === 'file').map((file) => (
              <tr key={file._id} className="border-t">
                <td className="px-4 py-2">{file.name}</td>
                <td className="px-4 py-2">{formatSize(file.size)}</td>
                <td className="px-4 py-2">{formatDate(file.createdAt)}</td>
                <td className="px-4 py-2 text-right">
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
                      <DropdownMenuItem onClick={() => openShare(file)}>
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copyLink(file)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy link
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => downloadFile(file)}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteFile(file)}
                        className="text-red-600 focus:text-red-700"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Share dialog (controlled) */}
      {activeFile && (
        <ShareDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          fileId={activeFile._id}
          fileName={activeFile.name}
          onSave={async (payload) => {
            console.log("save sharing", payload)
            toast({ title: "Share settings saved" })
          }}
          onRevoke={async (fileId) => {
            console.log("revoke link", fileId)
            toast({ title: "Link revoked" })
          }}
        />
      )}
    </>
  )
}
