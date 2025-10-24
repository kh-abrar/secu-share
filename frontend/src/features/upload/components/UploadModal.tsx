// features/upload/components/UploadModal.tsx
import { useState, useEffect } from "react";
import { Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import UploadDropzone from "@/features/upload/components/UploadDropZone";
import api from "@/libs/api";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

type ShareType = "public" | "private";

export default function UploadModal() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<File[]>([]);
  const [shareType, setShareType] = useState<ShareType>("public");
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [expiry, setExpiry] = useState<"24h" | "7d" | "never">("7d");
  const [isPasswordEnabled, setIsPasswordEnabled] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleAddEmail = () => {
    const mail = emailInput.trim().toLowerCase();
    if (!mail) return;
    if (!emails.includes(mail)) setEmails((prev) => [...prev, mail]);
    setEmailInput("");
  };
  const handleRemoveEmail = (target: string) => setEmails((prev) => prev.filter((m) => m !== target));

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(password);
  };

  const resetAll = () => {
    setSelected([]); setEmails([]); setShareType("public"); setEmailInput("");
    setExpiry("7d"); setIsPasswordEnabled(false); setPassword(""); setBusy(false); setError(null);
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        setOpen(false);
        resetAll();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open]);

  const handleUpload = async () => {
    if (!selected.length) return;
    setBusy(true); setError(null);
    
    const fileCount = selected.length;
    const fileNames = selected.slice(0, 3).map(f => f.name).join(", ");
    const displayNames = fileCount > 3 ? `${fileNames} and ${fileCount - 3} more` : fileNames;
    
    try {
      // First, upload the files
      const form = new FormData();
      for (const f of selected) {
        form.append("files", f);
        const rel = (f as any).webkitRelativePath || f.name;
        form.append("relativePaths", rel);
      }
      form.append("parentPath", "/"); // Upload to root path
      form.append("expiry", expiry);
      form.append("shareType", shareType);
      if (shareType === "private") form.append("emails", JSON.stringify(emails));

      const uploadResponse = await api.post("/files/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // If password protection is enabled, create password-protected share links
      if (isPasswordEnabled && password.trim()) {
        const uploadedFiles = uploadResponse.data.created || [];
        
        for (const file of uploadedFiles) {
          const sharePayload = {
            fileId: file.id, // Use 'id' instead of '_id' as returned by backend
            password: password.trim(),
            expiresIn: expiry === "24h" ? 24 * 3600 : expiry === "7d" ? 7 * 24 * 3600 : undefined,
            scope: shareType === "private" ? "restricted" : "public",
            emails: shareType === "private" ? emails : undefined,
          };

          await api.post("/share/protected", sharePayload);
        }
      }

      // Invalidate and refetch files to show newly uploaded files
      await queryClient.invalidateQueries({ queryKey: ['files'] });
      await queryClient.invalidateQueries({ queryKey: ['files', 'all'] });

      // Show success toast with animation
      const protectionText = isPasswordEnabled && password.trim() ? " with password protection" : "";
      toast({
        title: "✅ Upload Successful!",
        description: `${fileCount} file${fileCount > 1 ? 's' : ''} uploaded successfully${protectionText}: ${displayNames}`,
        duration: 5000,
      });

      setOpen(false); 
      resetAll();
    } catch (e: any) {
      const errorMsg = e?.response?.data?.message || e?.message || "Upload failed.";
      setError(errorMsg);
      
      // Show error toast with animation
      toast({
        title: "❌ Upload Failed",
        description: errorMsg,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetAll(); }}>
      <DialogTrigger asChild>
        <Button className="bg-accent text-white hover:opacity-90" type="button">
          <Upload className="mr-2 h-4 w-4" /> Upload
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg w-[95%] max-h-[90vh] p-0 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="px-6 py-4 border-b border-neutral-200 bg-white">
          <DialogHeader className="space-y-0">
            <DialogTitle className="text-lg font-semibold text-neutral-900">Upload Files</DialogTitle>
            <p className="text-sm text-neutral-500 mt-1">Share files securely with customizable access controls</p>
          </DialogHeader>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {/* Upload Section */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-neutral-900">Files to Upload</div>
            <UploadDropzone onSelect={setSelected} accept={["application/pdf","image/png","image/jpeg","text/plain"]} maxFiles={2000} maxSizeMB={512} />
            
            {selected.length > 0 && (
              <div className="bg-neutral-50 rounded-lg border border-neutral-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-neutral-700">{selected.length} file{selected.length > 1 ? 's' : ''} selected</span>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {selected.slice(0, 20).map((f) => {
                    const rel = (f as any).webkitRelativePath || f.name;
                    return (
                      <div key={rel + f.size + f.lastModified} className="flex items-center justify-between bg-white rounded px-2 py-1 text-xs border">
                        <span className="truncate text-neutral-700" title={rel}>{rel}</span>
                      </div>
                    );
                  })}
                  {selected.length > 20 && (
                    <div className="text-xs text-neutral-500 text-center py-1">
                      +{selected.length - 20} more files
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-neutral-200"></div>

          {/* Settings Section */}
          <div className="space-y-5">
            <div className="text-sm font-medium text-neutral-900">Sharing Settings</div>
            
            {/* Expiry & Share Type Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Link Expiry */}
              <div className="space-y-2">
                <Label htmlFor="expiry" className="text-sm font-medium text-neutral-700">Link Expiry</Label>
                <select 
                  id="expiry" 
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  value={expiry} 
                  onChange={(e) => setExpiry(e.target.value as any)}
                >
                  <option value="24h">24 hours</option>
                  <option value="7d">7 days</option>
                  <option value="never">Never expires</option>
                </select>
              </div>

              {/* Share Type */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-neutral-700">Access Level</Label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="shareType" 
                      value="public" 
                      checked={shareType === "public"} 
                      onChange={() => setShareType("public")}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-neutral-300"
                    />
                    <span className="text-sm text-neutral-700">Public link</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="shareType" 
                      value="private" 
                      checked={shareType === "private"} 
                      onChange={() => setShareType("private")}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-neutral-300"
                    />
                    <span className="text-sm text-neutral-700">Specific users</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Allowed Emails Section */}
            {shareType === "private" && (
              <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="emails" className="text-sm font-medium text-blue-900">Allowed Emails</Label>
                  <span className="text-xs text-blue-600">{emails.length} user{emails.length !== 1 ? 's' : ''} added</span>
                </div>
                
                <div className="flex gap-2">
                  <Input 
                    id="emails" 
                    type="email" 
                    value={emailInput} 
                    placeholder="Enter email address"
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddEmail(); } }}
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    onClick={handleAddEmail}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4"
                  >
                    Add
                  </Button>
                </div>
                
                {emails.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {emails.map((mail) => (
                      <div key={mail} className="flex items-center gap-1 bg-white rounded-md border border-blue-300 px-2 py-1 text-sm">
                        <span className="truncate max-w-[140px] text-blue-900">{mail}</span>
                        <button 
                          type="button" 
                          className="text-blue-500 hover:text-red-600 transition-colors" 
                          onClick={() => handleRemoveEmail(mail)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
              <Label htmlFor="passwordProtection" className="text-sm font-medium text-neutral-900 cursor-pointer">
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
                  Recipients will need this password to access the shared files.
                </p>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 bg-white">
          <div className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => { setOpen(false); resetAll(); }} 
              disabled={busy}
              className="px-6"
            >
              Cancel
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6" 
              onClick={handleUpload} 
              disabled={busy || selected.length === 0 || (isPasswordEnabled && !password.trim())} 
              type="button"
            >
              {busy ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
