import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Copy, Link2, Shield, Trash2 } from "lucide-react"

type ShareVisibility = "public" | "specific"
type Expiry = "24h" | "7d" | "never"

export type ShareDialogProps = {
  open: boolean
  onOpenChange: (v: boolean) => void

  // File context
  fileId: string
  fileName: string

  // Current settings (optional; can be undefined for new)
  initialLink?: string
  initialVisibility?: ShareVisibility
  initialExpiry?: Expiry
  initialEmailsCSV?: string

  // Callbacks to integrate with API later
  onSave?: (payload: {
    fileId: string
    visibility: ShareVisibility
    expiry: Expiry
    emailsCSV?: string
    link: string
  }) => void | Promise<void>
  onRevoke?: (fileId: string) => void | Promise<void>
}

export default function ShareDialog(props: ShareDialogProps) {
  const {
    open,
    onOpenChange,
    fileId,
    fileName,
    initialLink,
    initialVisibility = "public",
    initialExpiry = "7d",
    initialEmailsCSV = "",
    onSave,
    onRevoke,
  } = props

  const { toast } = useToast()

  // Local UI state (controlled by parent for open/close)
  const [visibility, setVisibility] = useState<ShareVisibility>(initialVisibility)
  const [expiry, setExpiry] = useState<Expiry>(initialExpiry)
  const [emailsCSV, setEmailsCSV] = useState(initialEmailsCSV)
  const [link, setLink] = useState(initialLink || "")

  // When opened, seed defaults (useful if opening for different files)
  useEffect(() => {
    if (open) {
      setVisibility(initialVisibility)
      setExpiry(initialExpiry)
      setEmailsCSV(initialEmailsCSV)
      setLink(initialLink || "")
    }
  }, [open, initialVisibility, initialExpiry, initialEmailsCSV, initialLink])

  // Simple placeholder “generate link” if none exists yet.
  // In real app, you’d request it from backend.
  const generatedLink = useMemo(() => {
    if (link) return link
    const slug = `${fileId.slice(0, 6)}-${Math.random().toString(36).slice(2, 8)}`
    return `${window.location.origin}/s/${slug}`
  }, [link, fileId])

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink)
      toast({ title: "Copied", description: "Share link copied to clipboard." })
    } catch {
      toast({ title: "Copy failed", description: "Could not copy link.", variant: "destructive" })
    }
  }

  const handleSave = async () => {
    try {
      await onSave?.({
        fileId,
        visibility,
        expiry,
        emailsCSV: visibility === "specific" ? emailsCSV : undefined,
        link: generatedLink,
      })
      toast({ title: "Sharing updated" })
      onOpenChange(false)
    } catch (e: any) {
      toast({ title: "Could not save", description: e?.message || "Try again", variant: "destructive" })
    }
  }

  const handleRevoke = async () => {
    try {
      await onRevoke?.(fileId)
      toast({ title: "Link revoked" })
      onOpenChange(false)
    } catch (e: any) {
      toast({ title: "Revoke failed", description: e?.message || "Try again", variant: "destructive" })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share “{fileName}”</DialogTitle>
        </DialogHeader>

        {/* Link box */}
        <div className="space-y-2">
          <Label>Shareable Link</Label>
          <div className="flex items-center gap-2">
            <div className="flex w-full items-center rounded-md border px-3 py-2">
              <Link2 className="mr-2 h-4 w-4 text-neutral-400" />
              <input
                readOnly
                value={generatedLink}
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
            <Button variant="outline" onClick={copyToClipboard}>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
          </div>
        </div>

        {/* Visibility */}
        <div className="mt-4 space-y-2">
          <Label>Access</Label>
          <div className="flex flex-col gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="share-visibility"
                value="public"
                checked={visibility === "public"}
                onChange={() => setVisibility("public")}
              />
              Public (anyone with the link)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="share-visibility"
                value="specific"
                checked={visibility === "specific"}
                onChange={() => setVisibility("specific")}
              />
              Specific users only
            </label>
          </div>
        </div>

        {/* Specific users input */}
        {visibility === "specific" && (
          <div className="mt-2 space-y-2">
            <Label htmlFor="emails">Allowed Emails (comma-separated)</Label>
            <Input
              id="emails"
              placeholder="alice@example.com, bob@example.com"
              value={emailsCSV}
              onChange={(e) => setEmailsCSV(e.target.value)}
            />
          </div>
        )}

        {/* Expiry */}
        <div className="mt-4 space-y-2">
          <Label>Link Expiry</Label>
          <Select value={expiry} onValueChange={(v: Expiry) => setExpiry(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose expiry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24 hours</SelectItem>
              <SelectItem value="7d">7 days</SelectItem>
              <SelectItem value="never">Never</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between">
          <Button variant="destructive" onClick={handleRevoke}>
            <Trash2 className="mr-2 h-4 w-4" />
            Revoke Link
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="bg-accent text-white hover:opacity-90" onClick={handleSave}>
              <Shield className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
