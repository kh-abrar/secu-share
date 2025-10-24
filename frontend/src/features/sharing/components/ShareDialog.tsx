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
  initialPassword?: string

  // Callbacks to integrate with API later
  onSave?: (payload: {
    fileId: string
    visibility: ShareVisibility
    expiry: Expiry
    emailsCSV?: string
    password?: string
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
    initialPassword = "",
    onSave,
    onRevoke,
  } = props

  const { toast } = useToast()

  // Local UI state (controlled by parent for open/close)
  const [visibility, setVisibility] = useState<ShareVisibility>(initialVisibility)
  const [expiry, setExpiry] = useState<Expiry>(initialExpiry)
  const [emailsCSV, setEmailsCSV] = useState(initialEmailsCSV)
  const [link, setLink] = useState(initialLink || "")
  const [isPasswordEnabled, setIsPasswordEnabled] = useState(!!initialPassword)
  const [password, setPassword] = useState(initialPassword)

  // When opened, seed defaults (useful if opening for different files)
  useEffect(() => {
    if (open) {
      setVisibility(initialVisibility)
      setExpiry(initialExpiry)
      setEmailsCSV(initialEmailsCSV)
      setLink(initialLink || "")
      setIsPasswordEnabled(!!initialPassword)
      setPassword(initialPassword)
    }
  }, [open, initialVisibility, initialExpiry, initialEmailsCSV, initialLink, initialPassword])

  // Generate or use existing link
  const generatedLink = useMemo(() => {
    if (link) return link
    // If no existing link, we'll generate one when saving
    return ""
  }, [link])

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink)
      toast({ title: "Copied", description: "Share link copied to clipboard." })
    } catch {
      toast({ title: "Copy failed", description: "Could not copy link.", variant: "destructive" })
    }
  }

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let newPassword = '';
    for (let i = 0; i < 8; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(newPassword);
  }

  const handleSave = async () => {
    try {
      await onSave?.({
        fileId,
        visibility,
        expiry,
        emailsCSV: visibility === "specific" ? emailsCSV : undefined,
        password: isPasswordEnabled ? password : undefined,
        link: generatedLink,
      })
      onOpenChange(false)
    } catch (e: any) {
      // Error handling is done in parent component
      console.error("Share save error:", e)
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
      <DialogContent className="sm:max-w-lg w-[95%] max-h-[90vh] p-0 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="px-6 py-4 border-b border-neutral-200 bg-white">
          <DialogHeader className="space-y-0">
            <DialogTitle className="text-lg font-semibold text-neutral-900">Share "{fileName}"</DialogTitle>
            <p className="text-sm text-neutral-500 mt-1">Configure sharing settings and access controls</p>
          </DialogHeader>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {/* Link Section */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-neutral-900">Shareable Link</div>
            <div className="flex items-center gap-2">
              <div className="flex w-full items-center rounded-lg border border-neutral-300 px-3 py-2 bg-neutral-50">
                <Link2 className="mr-2 h-4 w-4 text-neutral-500" />
                <input
                  readOnly
                  value={generatedLink}
                  className="w-full bg-transparent text-sm outline-none text-neutral-700"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={copyToClipboard}
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-neutral-200"></div>

          {/* Settings Section */}
          <div className="space-y-5">
            <div className="text-sm font-medium text-neutral-900">Sharing Settings</div>
            
            {/* Access Level & Expiry Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Access Level */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-neutral-700">Access Level</Label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="share-visibility"
                      value="public"
                      checked={visibility === "public"}
                      onChange={() => setVisibility("public")}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-neutral-300"
                    />
                    <span className="text-sm text-neutral-700">Public link</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="share-visibility"
                      value="specific"
                      checked={visibility === "specific"}
                      onChange={() => setVisibility("specific")}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-neutral-300"
                    />
                    <span className="text-sm text-neutral-700">Specific users</span>
                  </label>
                </div>
              </div>

              {/* Expiry */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-neutral-700">Link Expiry</Label>
                <Select value={expiry} onValueChange={(v: Expiry) => setExpiry(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose expiry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">24 hours</SelectItem>
                    <SelectItem value="7d">7 days</SelectItem>
                    <SelectItem value="never">Never expires</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Specific users input */}
            {visibility === "specific" && (
              <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 space-y-3">
                <Label htmlFor="emails" className="text-sm font-medium text-blue-900">Allowed Emails</Label>
                <Input
                  id="emails"
                  placeholder="alice@example.com, bob@example.com"
                  value={emailsCSV}
                  onChange={(e) => setEmailsCSV(e.target.value)}
                  className="text-sm"
                />
                <p className="text-xs text-blue-700">
                  Enter email addresses separated by commas
                </p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-neutral-200"></div>

          {/* Password Protection Section */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="passwordProtection"
                checked={isPasswordEnabled}
                onChange={(e) => setIsPasswordEnabled(e.target.checked)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-neutral-300 rounded"
              />
              <Label htmlFor="passwordProtection" className="text-sm font-medium text-neutral-900 cursor-pointer flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Password Protection
              </Label>
            </div>
            
            {isPasswordEnabled && (
              <div className="bg-amber-50 rounded-lg border border-amber-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-amber-900">Set Password</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateRandomPassword}
                    className="text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
                  >
                    Generate
                  </Button>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password for file access"
                  className="text-sm"
                />
                <p className="text-xs text-amber-700">
                  Recipients will need this password to access the shared file.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 bg-white">
          <div className="flex items-center justify-between">
            <Button 
              variant="destructive" 
              onClick={handleRevoke}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Revoke Link
            </Button>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="px-6"
              >
                Cancel
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6" 
                onClick={handleSave}
              >
                <Shield className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
