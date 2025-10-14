import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight, Folder, Search, X } from "lucide-react";
import api from "@/libs/api";
import { useToast } from "@/hooks/use-toast";
import type { FileItem } from "../types";

interface MoveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: FileItem | null;
  folders: FileItem[];
  refreshFiles: () => void;
}

export default function MoveModal({ open, onOpenChange, item, folders, refreshFiles }: MoveModalProps) {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  // Clear search when modal opens
  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setSelectedFolder(null);
    }
  }, [open]);

  const handleMove = async () => {
    if (!item || selectedFolder === undefined) return;
    
    try {
      setLoading(true);
      await api.put('/files/move', {
        itemId: item._id,
        targetFolderId: selectedFolder
      });
      
      toast({
        title: "✅ Item moved successfully",
        description: `${item.name} has been moved to the selected location`
      });
      
      refreshFiles();
      onOpenChange(false);
      setSelectedFolder(null);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Failed to move item";
      toast({
        title: "❌ Move failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFolder(null);
    setSearchQuery('');
    onOpenChange(false);
  };

  // Filter out the current item and its subfolders to prevent circular moves
  const availableFolders = useMemo(() => {
    return folders.filter(folder => {
      if (!item) return true;
      
      // Don't show the item itself if it's a folder
      if (folder._id === item._id) return false;
      
      // Don't show subfolders of the item being moved
      if (item.type === 'folder') {
        const itemPath = `${item.path}${item.name}/`;
        const folderPath = `${folder.path}${folder.name}/`;
        return !folderPath.startsWith(itemPath);
      }
      
      return true;
    });
  }, [folders, item]);

  // Filter folders based on search query
  const filteredFolders = useMemo(() => {
    if (!searchQuery.trim()) return availableFolders;
    
    const query = searchQuery.toLowerCase().trim();
    return availableFolders.filter(folder => {
      const folderName = folder.name.toLowerCase();
      const folderPath = `${folder.path}${folder.name}/`.toLowerCase();
      return folderName.includes(query) || folderPath.includes(query);
    });
  }, [availableFolders, searchQuery]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Move "{item?.name}" to...</DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div className="max-h-60 overflow-y-auto border rounded p-2 space-y-1">
          <div
            className={`cursor-pointer p-2 rounded hover:bg-accent/20 ${
              selectedFolder === null ? "bg-accent/30" : ""
            }`}
            onClick={() => setSelectedFolder(null)}
          >
            <ChevronRight className="inline-block w-4 h-4 mr-2" />
            <span className="font-medium">Root Directory</span>
          </div>

          {filteredFolders.map((folder) => (
            <div
              key={folder._id}
              className={`cursor-pointer p-2 rounded hover:bg-accent/20 ${
                selectedFolder === folder._id ? "bg-accent/30" : ""
              }`}
              onClick={() => setSelectedFolder(folder._id)}
            >
              <Folder className="inline-block w-4 h-4 mr-2" />
              <span className="text-sm">
                {folder.path === '/' ? '' : folder.path}{folder.name}/
              </span>
            </div>
          ))}
          
          {filteredFolders.length === 0 && availableFolders.length > 0 && (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No folders match your search
            </div>
          )}
          
          {availableFolders.length === 0 && (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No available folders to move to
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="ghost" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleMove} 
            disabled={loading || selectedFolder === undefined}
          >
            {loading ? "Moving..." : "Move Here"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
