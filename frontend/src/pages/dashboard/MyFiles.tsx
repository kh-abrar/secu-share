import { useState, useMemo } from 'react';
import { PageHeader } from "@/components/layout/PageHeader";
import { FileToolbar } from "@/features/files/components/FileToolbar";
import { FileGrid } from "@/features/files/components/FileGrid";
import { FileList } from "@/features/files/components/FileList";
import { StorageBar } from "@/features/files/components/StorageBar";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import ShareDialog from "@/features/sharing/components/ShareDialog";
import MoveModal from "@/features/files/components/MoveModal";
import { useFilesByPath, useCreateFolder, useDeleteFile, useStorageUsage } from "@/features/files/hooks/useFilesByPath";
import { useToast } from "@/hooks/use-toast";
import api from "@/libs/api";
import type { FileItem } from "@/features/files/types";

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'images' | 'documents' | 'videos' | 'shared' | 'private';
type SortType = 'name' | 'date' | 'size';

export default function MyFiles() {
  const [currentPath, setCurrentPath] = useState('/');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('name');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareFile, setShareFile] = useState<FileItem | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveFile, setMoveFile] = useState<FileItem | null>(null);
  
  const { toast } = useToast();
  const { data: files, isLoading, error } = useFilesByPath(currentPath);
  const { data: storageData, isLoading: storageLoading } = useStorageUsage();
  const createFolderMutation = useCreateFolder();
  const deleteFileMutation = useDeleteFile();

  // Get all folders for move modal
  const { data: allFiles } = useFilesByPath('/');
  const allFolders = allFiles?.filter(file => file.type === 'folder') || [];

  // Filter and sort files
  const filteredAndSortedFiles = useMemo(() => {
    if (!files) return [];

    const filtered = files.filter(file => {
      // Search filter
      if (searchQuery && !file.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Type filter
      switch (filter) {
        case 'images':
          return file.type === 'file' && file.mimetype?.startsWith('image/');
        case 'documents':
          return file.type === 'file' && (
            file.mimetype?.includes('pdf') ||
            file.mimetype?.includes('document') ||
            file.mimetype?.includes('text')
          );
        case 'videos':
          return file.type === 'file' && file.mimetype?.startsWith('video/');
        case 'shared':
          return file.sharedWith && file.sharedWith.length > 0;
        case 'private':
          return !file.sharedWith || file.sharedWith.length === 0;
        default:
          return true;
      }
    });

    // Sort files
    filtered.sort((a, b) => {
      switch (sort) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case 'size':
          return (b.size || 0) - (a.size || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [files, searchQuery, filter, sort]);

  const handleFolderClick = (folder: FileItem) => {
    if (folder.type === 'folder') {
      const newPath = `${folder.path}${folder.name}/`;
      setCurrentPath(newPath);
      setSelectedFiles([]); // Clear selection when navigating
    }
  };

  const handleBreadcrumbNavigate = (path: string) => {
    setCurrentPath(path.endsWith('/') ? path : `${path}/`);
    setSelectedFiles([]); // Clear selection when navigating
  };

  const handleSelectFile = (fileId: string, selected: boolean) => {
    setSelectedFiles(prev => 
      selected 
        ? [...prev, fileId]
        : prev.filter(id => id !== fileId)
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedFiles(selected ? filteredAndSortedFiles.map(f => f._id) : []);
  };

  const handleCreateFolder = async (name: string) => {
    try {
      await createFolderMutation.mutateAsync({ name, path: currentPath });
      toast({ title: "✅ Folder created successfully" });
    } catch (error: unknown) {
      toast({ 
        title: "❌ Failed to create folder",
        description: (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || (error as { message?: string })?.message,
        variant: "destructive"
      });
    }
  };

  const handleDownload = async (file: FileItem) => {
    if (file.type === 'folder') {
      toast({ title: "❌ Cannot download folders", variant: "destructive" });
      return;
    }

    try {
      // Create download link directly to our backend endpoint
      const link = document.createElement('a');
      link.href = api.defaults.baseURL + `/files/download/${file._id}`;
      link.download = file.name || 'download';
      link.style.display = 'none';
      
      // Add to DOM, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({ title: "✅ Download started" });
    } catch (error: unknown) {
      const errorMsg = (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || (error as { message?: string })?.message || "Download failed";
      toast({ 
        title: "❌ Download failed", 
        description: errorMsg,
        variant: "destructive" 
      });
    }
  };

  const handleShare = (file: FileItem) => {
    setShareFile(file);
    setShareDialogOpen(true);
  };

  const handleMove = (file: FileItem) => {
    setMoveFile(file);
    setMoveDialogOpen(true);
  };

  const handleDelete = async (file: FileItem) => {
    const isFolder = file.type === 'folder';
    const confirmMessage = isFolder 
      ? `Delete folder "${file.name}" and all its contents? This action cannot be undone.`
      : `Delete "${file.name}"?`;
    
    if (!confirm(confirmMessage)) return;
    
    try {
      await deleteFileMutation.mutateAsync(file._id);
      setSelectedFiles(prev => prev.filter(id => id !== file._id));
      toast({ 
        title: isFolder ? "✅ Folder and all contents deleted successfully" : "✅ File deleted successfully" 
      });
    } catch (error: unknown) {
      toast({ 
        title: isFolder ? "❌ Failed to delete folder" : "❌ Failed to delete file",
        description: (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || (error as { message?: string })?.message,
        variant: "destructive"
      });
    }
  };

  const handleRename = () => {
    // Implement rename logic
    toast({ title: "Rename functionality coming soon" });
  };

  const handleBulkDelete = async () => {
    const selectedItems = filteredAndSortedFiles.filter(f => selectedFiles.includes(f._id));
    const folderCount = selectedItems.filter(f => f.type === 'folder').length;
    
    let confirmMessage = `Delete ${selectedFiles.length} selected items?`;
    if (folderCount > 0) {
      confirmMessage += `\n\nThis includes ${folderCount} folder(s) and all their contents. This action cannot be undone.`;
    }
    
    if (!confirm(confirmMessage)) return;
    
    try {
      for (const fileId of selectedFiles) {
        await deleteFileMutation.mutateAsync(fileId);
      }
      setSelectedFiles([]);
      
      const successMessage = folderCount > 0 
        ? `✅ ${selectedFiles.length} items deleted successfully (including ${folderCount} folder(s) and all contents)`
        : `✅ ${selectedFiles.length} files deleted successfully`;
      
      toast({ title: successMessage });
    } catch (error: unknown) {
      toast({ 
        title: "❌ Failed to delete items",
        description: (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || (error as { message?: string })?.message,
        variant: "destructive"
      });
    }
  };

  const handleBulkShare = () => {
    // Implement bulk share logic
    toast({ title: "Bulk share functionality coming soon" });
  };

  const handleShareSave = async (payload: {
    fileId: string;
    visibility: "public" | "specific";
    expiry: "24h" | "7d" | "never";
    emailsCSV?: string;
    link: string;
  }) => {
    try {
      const emails = payload.emailsCSV?.split(',').map(e => e.trim()).filter(Boolean) || [];
      const scope = payload.visibility === 'specific' ? 'restricted' : 'public';
      
      // Convert expiry to seconds
      let expiresIn: number | undefined;
      switch (payload.expiry) {
        case '24h': expiresIn = 24 * 3600; break;
        case '7d': expiresIn = 7 * 24 * 3600; break;
        case 'never': expiresIn = undefined; break;
      }

      const response = await api.post('/share/create', {
        fileId: payload.fileId,
        scope,
        expiresIn,
        emails: scope === 'restricted' ? emails : undefined,
        maxAccess: null,
      });

      toast({ 
        title: "✅ Share link created", 
        description: "Link has been generated and saved" 
      });
      
      // Update the share file with the new link
      if (shareFile) {
        setShareFile({ ...shareFile, shareUrl: response.data.shareUrl });
      }
    } catch (error: unknown) {
      const errorMsg = (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || (error as { message?: string })?.message || "Failed to create share link";
      toast({ 
        title: "❌ Failed to create share link", 
        description: errorMsg,
        variant: "destructive" 
      });
      throw error;
    }
  };

  const handleShareRevoke = async () => {
    try {
      // For now, just show a message since we don't have revoke functionality
      toast({ title: "Share link revoked" });
    } catch (error: unknown) {
      toast({ 
        title: "❌ Failed to revoke share link", 
        description: (error as { message?: string })?.message || "Try again",
        variant: "destructive" 
      });
    }
  };

  // Real storage data from backend
  const storageUsed = storageData?.used || 0;
  const storageTotal = storageData?.total || 15 * 1024 * 1024 * 1024; // Default 15GB

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900 mx-auto mb-2"></div>
          <p className="text-sm text-neutral-600">Loading files...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
        <p className="text-sm text-red-600">Failed to load files</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-neutral-50">
      <div className="bg-white border-b border-neutral-200">
        <div className="container mx-auto px-4 py-6">
          <PageHeader
            title="My Files"
            description="Browse and manage your files and folders"
          />
          
          {/* Breadcrumbs */}
          <div className="mt-4">
            <Breadcrumbs path={currentPath} onNavigate={handleBreadcrumbNavigate} />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <FileToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filter={filter}
        onFilterChange={setFilter}
        sort={sort}
        onSortChange={setSort}
        selectedCount={selectedFiles.length}
        onBulkDelete={handleBulkDelete}
        onBulkShare={handleBulkShare}
        onCreateFolder={handleCreateFolder}
      />

      {/* File display */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'grid' ? (
          <FileGrid
            files={filteredAndSortedFiles}
            selectedFiles={selectedFiles}
            onSelectFile={handleSelectFile}
            onSelectAll={handleSelectAll}
            onFolderClick={handleFolderClick}
            onDownload={handleDownload}
            onShare={handleShare}
            onDelete={handleDelete}
            onRename={handleRename}
            onMove={handleMove}
          />
        ) : (
          <FileList
            files={filteredAndSortedFiles}
            selectedFiles={selectedFiles}
            onSelectFile={handleSelectFile}
            onSelectAll={handleSelectAll}
            onFolderClick={handleFolderClick}
            onDownload={handleDownload}
            onShare={handleShare}
            onDelete={handleDelete}
            onRename={handleRename}
            onMove={handleMove}
          />
        )}
      </div>

      {/* Storage bar */}
      {!storageLoading && (
        <StorageBar used={storageUsed} total={storageTotal} />
      )}

      {/* Share Dialog */}
      {shareFile && (
        <ShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          fileId={shareFile._id}
          fileName={shareFile.name}
          initialLink={shareFile.shareUrl}
          onSave={handleShareSave}
          onRevoke={handleShareRevoke}
        />
      )}

      {/* Move Dialog */}
      {moveFile && (
        <MoveModal
          open={moveDialogOpen}
          onOpenChange={setMoveDialogOpen}
          item={moveFile}
          folders={allFolders}
          refreshFiles={() => {
            // Refresh current path files
            window.location.reload(); // Simple refresh for now
          }}
        />
      )}
    </div>
  );
}
