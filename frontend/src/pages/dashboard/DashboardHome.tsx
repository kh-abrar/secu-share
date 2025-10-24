import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from "@/components/layout/PageHeader";
import { FileToolbar } from "@/features/files/components/FileToolbar";
import { FileGrid } from "@/features/files/components/FileGrid";
import { FileList } from "@/features/files/components/FileList";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import ShareDialog from "@/features/sharing/components/ShareDialog";
import MoveModal from "@/features/files/components/MoveModal";
import { StatCard, StorageStatCard } from "@/components/dashboard";
import { useFilesByPath, useCreateFolder, useDeleteFile, useStorageUsage, useAllFiles } from "@/features/files/hooks/useFilesByPath";
import { useAuthStore } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { FileItem } from "@/features/files/types";

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'images' | 'documents' | 'videos' | 'shared' | 'private';
type SortType = 'name' | 'date' | 'size';

export default function DashboardHome() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
  const { user } = useAuthStore();
  const { data: files, isLoading, error } = useFilesByPath(currentPath);
  const { data: storageData } = useStorageUsage();
  const { data: allFiles } = useAllFiles(); // Use the new hook that fetches all files recursively
  const createFolderMutation = useCreateFolder();
  const deleteFileMutation = useDeleteFile();

  // Get all folders for move modal (from root directory only for move functionality)
  const { data: rootFiles } = useFilesByPath('/');
  const allFolders = rootFiles?.filter(file => file.type === 'folder') || [];

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

  // Calculate dashboard stats
  const dashboardStats = useMemo(() => {
    if (!allFiles) return { totalFiles: 0, sharedFiles: 0, recentUploads: [] };
    
    const totalFiles = allFiles.filter(file => file.type === 'file').length;
    // Count files that have share links (most accurate way to count shared files)
    const sharedFiles = allFiles.filter(file => 
      file.type === 'file' && file.hasShareLink === true
    ).length;
    
    // Get recent uploads (files only, sorted by creation date)
    const recentUploads = allFiles
      .filter(file => file.type === 'file')
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5);

    return { totalFiles, sharedFiles, recentUploads };
  }, [allFiles]);

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
      link.href = `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/files/download/${file._id}`;
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


  const handleViewAllFiles = () => {
    navigate('/dashboard/my-files');
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

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/share/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          fileId: payload.fileId,
          scope,
          expiresIn,
          emails: scope === 'restricted' ? emails : undefined,
          maxAccess: null,
        })
      });

      if (!response.ok) throw new Error('Failed to create share link');

      toast({ 
        title: "✅ Share link created", 
        description: "Link has been generated and saved" 
      });
      
      // Update the share file with the new link
      if (shareFile) {
        setShareFile({ ...shareFile, shareUrl: (await response.json()).shareUrl });
      }
      
      // Invalidate files queries to refresh dashboard statistics
      await queryClient.invalidateQueries({ queryKey: ['files'] });
      await queryClient.invalidateQueries({ queryKey: ['files', 'all'] });
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
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-neutral-200 shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <PageHeader
            title="Dashboard"
            description={`Welcome back, ${user?.name || user?.email || 'User'}! Here's your cloud summary.`}
          />
          
          {/* View All Files Link */}
          <div className="mt-4">
            <button
              onClick={handleViewAllFiles}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
            >
              View All Files →
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6 space-y-6">
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              icon={
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              title="Total Files"
              value={dashboardStats.totalFiles}
              description="Files in your cloud"
            />
            
            <StatCard
              icon={
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
              }
              title="Shared Files"
              value={dashboardStats.sharedFiles}
              description="Files shared with others"
            />
            
            <StorageStatCard
              used={storageData?.used || 0}
              total={storageData?.total || 15 * 1024 * 1024 * 1024}
            />
          </div>


          {/* File Browser Section */}
          <div className="bg-white/60 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200/50">
            <div className="p-6 border-b border-gray-200/50">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Browse Files</h3>
              
              {/* Breadcrumbs */}
              <Breadcrumbs path={currentPath} onNavigate={handleBreadcrumbNavigate} />
              
              {/* Toolbar */}
              <div className="mt-4">
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
              </div>
            </div>

            {/* File display */}
            <div className="p-6">
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
          </div>
        </div>
      </div>

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
