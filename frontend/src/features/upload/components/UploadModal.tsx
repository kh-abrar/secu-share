import { useState } from "react"
import { Upload, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import UploadDropzone from "@/features/upload/components/UploadDropZone"

export default function UploadModal() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<File[]>([])
  const [shareType, setShareType] = useState<"public" | "private">("public")
  const [emails, setEmails] = useState<string[]>([])
  const [emailInput, setEmailInput] = useState("")

  const handleAddEmail = () => {
    if (emailInput && !emails.includes(emailInput)) {
      setEmails((prev) => [...prev, emailInput])
      setEmailInput("")
    }
  }

  const handleRemoveEmail = (target: string) => {
    setEmails((prev) => prev.filter((mail) => mail !== target))
  }

  const handleUpload = () => {
    console.log("Files:", selected)
    console.log("Share type:", shareType)
    if (shareType === "private") {
      console.log("Allowed users:", emails)
    }
    // TODO: send this payload to backend
    setOpen(false)
    setSelected([])
    setEmails([])
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent text-white hover:opacity-90">
          <Upload className="mr-2 h-4 w-4" />
          Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload File</DialogTitle>
        </DialogHeader>

        {/* Dropzone */}
        <UploadDropzone
          onSelect={setSelected}
          accept={["application/pdf", "image/png", "image/jpeg"]}
          maxFiles={10}
          maxSizeMB={50}
          className="mt-4"
        />

        {/* Expiry Select */}
        <div className="mt-6 space-y-2">
          <Label htmlFor="expiry">Link Expiry</Label>
          <select
            id="expiry"
            className="w-full rounded-md border border-neutral-300 p-2 text-sm"
            defaultValue="7d"
          >
            <option value="24h">24 hours</option>
            <option value="7d">7 days</option>
            <option value="never">Never</option>
          </select>
        </div>

        {/* Share Options */}
        <div className="mt-6 space-y-2">
          <Label>Share with</Label>
          <div className="flex flex-col space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="shareType"
                value="public"
                checked={shareType === "public"}
                onChange={() => setShareType("public")}
              />
              Public link
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="shareType"
                value="private"
                checked={shareType === "private"}
                onChange={() => setShareType("private")}
              />
              Specific users
            </label>
          </div>
        </div>

        {/* Conditional email input */}
        {shareType === "private" && (
          <div className="mt-4 space-y-2">
            <Label htmlFor="emails">Allowed Emails</Label>
            <div className="flex gap-2">
              <Input
                id="emails"
                type="email"
                value={emailInput}
                placeholder="user@example.com"
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddEmail()
                  }
                }}
              />
              <Button type="button" onClick={handleAddEmail}>
                Add
              </Button>
            </div>

            {/* Email chips */}
            {emails.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {emails.map((mail) => (
                  <div
                    key={mail}
                    className="flex items-center gap-1 rounded-md border bg-neutral-50 px-2 py-1 text-sm"
                  >
                    <span className="truncate max-w-[150px]">{mail}</span>
                    <button
                      type="button"
                      className="text-neutral-500 hover:text-red-600"
                      onClick={() => handleRemoveEmail(mail)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button
            className="bg-accent text-white hover:opacity-90"
            onClick={handleUpload}
            disabled={selected.length === 0}
          >
            Upload
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
