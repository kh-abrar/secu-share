import { useMemo, useState } from "react"
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

type FileRow = {
  id: string
  name: string
  size: string
  uploadedAt: string
}

const demoFiles: FileRow[] = [
  { id: "1", name: "report.pdf", size: "1.2 MB", uploadedAt: "2025-09-18" },
  { id: "2", name: "image.png", size: "500 KB", uploadedAt: "2025-09-19" },
]

export default function FileTable() {
  const [shareOpen, setShareOpen] = useState(false)
  const [activeFile, setActiveFile] = useState<FileRow | null>(null)

  const openShare = (file: FileRow) => {
    setActiveFile(file)
    setShareOpen(true)
  }

  const copyLink = async (file: FileRow) => {
    // Placeholder link format; replace with real short link from API
    const link = `${window.location.origin}/s/${file.id}`
    try {
      await navigator.clipboard.writeText(link)
      // optionally toast here
      // toast({ title: "Copied", description: "Link copied to clipboard." })
    } catch {
      // toast({ title: "Copy failed", variant: "destructive" })
    }
  }

  const downloadFile = (file: FileRow) => {
    // TODO: hook to your download endpoint/presigned URL
    // window.open(`/api/files/${file.id}/download`, "_blank")
    console.log("download", file.id)
  }

  const deleteFile = (file: FileRow) => {
    // TODO: call delete mutation; then refetch
    console.log("delete", file.id)
  }

  const rows = useMemo(() => demoFiles, [])

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
            {rows.map((file) => (
              <tr key={file.id} className="border-t">
                <td className="px-4 py-2">{file.name}</td>
                <td className="px-4 py-2">{file.size}</td>
                <td className="px-4 py-2">{file.uploadedAt}</td>
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
          fileId={activeFile.id}
          fileName={activeFile.name}
          // You can pass initial values if you have them:
          // initialLink="https://..." initialVisibility="public" initialExpiry="7d"
          onSave={async (payload) => {
            console.log("save sharing", payload)
            // TODO: call API to persist visibility/expiry/allowed users
          }}
          onRevoke={async (fileId) => {
            console.log("revoke link", fileId)
            // TODO: call API to revoke link
          }}
        />
      )}
    </>
  )
}
