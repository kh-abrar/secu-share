import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from "@/components/ui/dialog";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { useState } from "react";
  import { Upload } from "lucide-react";
  
  export default function UploadModal() {
    const [open, setOpen] = useState(false);
  
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
  
          {/* Drag & Drop Area */}
          <div className="mt-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 p-6 text-center">
            <p className="text-sm text-neutral-500">
              Drag & drop a file here or click below
            </p>
            <Input type="file" className="mt-4" />
          </div>
  
          {/* Expiry Select */}
          <div className="mt-6 space-y-2">
            <Label htmlFor="expiry">Link Expiry</Label>
            <select
              id="expiry"
              className="w-full rounded-md border border-neutral-300 p-2 text-sm"
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
                <input type="radio" name="shareType" value="public" defaultChecked />
                Public link
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="shareType" value="private" />
                Specific users
              </label>
            </div>
          </div>
  
          <div className="mt-6 flex justify-end">
            <Button
              className="bg-accent text-white hover:opacity-90"
              onClick={() => setOpen(false)}
            >
              Upload
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  