import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from "@/components/layout/PageHeader";
import { FileToolbar } from "@/features/files/components/FileToolbar";
import { FileGrid } from "@/features/files/components/FileGrid";
import { FileList } from "@/features/files/components/FileList";
import { StorageBar } from "@/features/files/components/StorageBar";
import { useSharedWithMe, useDownloadFile, useStorageUsage } from "@/features/files/hooks/useFilesByPath";
import { useUnseenSharedFiles } from "@/hooks/useUnseenSharedFiles";
import { useToast } from "@/hooks/use-toast";
import type { FileItem } from "@/features/files/types";

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'images' | 'documents' | 'videos' | 'shared' | 'private';
type SortType = 'name' | 'date' | 'size';

export default function SharedWithMe() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('name');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  
  const { data: files, isLoading, error } = useSharedWithMe();
  const { data: storageData, isLoading: storageLoading } = useStorageUsage();
  const { data: unseenData, refetch: refetchUnseen } = useUnseenSharedFiles();
  const unseenFiles = unseenData?.unseenLinks || [];
  const downloadMutation = useDownloadFile();
  const { toast } = useToast();

  // Refresh unseen count when page is viewed
  useEffect(() => {
    refetchUnseen();
  }, [refetchUnseen]);

  // Check if a file is unseen
  const isFileUnseen = (file: FileItem) => {
    return unseenFiles.some(unseenFile => unseenFile.file._id === file._id);
  };

  // Filter and sort shared files
  const filteredAndSortedFiles = useMemo(() => {
    if (!files) return [];

    const filtered = files.filter((file: FileItem) => {
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

  const handleDownload = async (file: FileItem) => {
    if (file.type === 'folder') {
      toast({ title: "❌ Cannot download folders", variant: "destructive" });
      return;
    }

    // If file is password-protected via share link, redirect to ShareAccessPage
    if (file.shareLinkInfo?.requiresPassword && file.shareLinkInfo?.token) {
      window.location.href = `/share/${file.shareLinkInfo.token}`;
      return;
    }

    try {
      await downloadMutation.mutateAsync({ fileId: file._id, filename: file.name });
      toast({ title: "✅ Download started" });
      
      // Refresh unseen count after successful download to update the notification badge
      refetchUnseen();
    } catch (error: unknown) {
      toast({ 
        title: "❌ Download failed", 
        variant: "destructive" 
      });
    }
  };

  const handleFolderClick = (_folder: FileItem) => {
    // Shared files are read-only, no folder navigation
    toast({ title: "📁 Folder navigation not available for shared files" });
  };

  const handleShare = (_file: FileItem) => {
    toast({ title: "🔒 Cannot share files that were shared with you" });
  };

  const handleDelete = (_file: FileItem) => {
    toast({ title: "🗑️ Cannot delete files that were shared with you" });
  };

  const handleRename = () => {
    toast({ title: "✏️ Cannot rename files that were shared with you" });
  };

  const handleMove = (_file: FileItem) => {
    toast({ title: "📁 Cannot move files that were shared with you" });
  };

  const handleCreateFolder = () => {
    toast({ title: "📁 Cannot create folders in shared files view" });
  };

  const handleBulkDelete = () => {
    toast({ title: "🗑️ Cannot delete files that were shared with you" });
  };

  const handleBulkShare = () => {
    toast({ title: "🔒 Cannot share files that were shared with you" });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 bg-white min-h-screen">
        <PageHeader
          title="Shared With Me"
          description="Files that others have shared with you"
        />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900 mx-auto mb-2"></div>
            <p className="text-sm text-neutral-600">Loading shared files...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6 bg-white min-h-screen">
        <PageHeader
          title="Shared With Me"
          description="Files that others have shared with you"
        />
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm text-red-600">Failed to load shared files</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 bg-white min-h-screen">
      <PageHeader
        title="Shared With Me"
        description={`Files that others have shared with you${unseenFiles.length > 0 ? ` • ${unseenFiles.length} new file${unseenFiles.length > 1 ? 's' : ''}` : ''}`}
      />

      {/* File Toolbar */}
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
        totalCount={filteredAndSortedFiles.length}
        onCreateFolder={handleCreateFolder}
        onBulkDelete={handleBulkDelete}
        onBulkShare={handleBulkShare}
        isSharedView={true} // Disable certain actions for shared files
      />

      {/* Files Display */}
      {filteredAndSortedFiles.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-12 text-center">
          <p className="text-neutral-600">
            {searchQuery || filter !== 'all' 
              ? 'No files match your current filters' 
              : 'No files shared with you yet'
            }
          </p>
          <p className="text-sm text-neutral-500 mt-1">
            {searchQuery || filter !== 'all' 
              ? 'Try adjusting your search or filter criteria' 
              : 'Files shared by others will appear here'
            }
          </p>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <FileGrid
              files={filteredAndSortedFiles}
              selectedFiles={selectedFiles}
              onSelectFile={handleSelectFile}
              onSelectAll={handleSelectAll}
              onFileClick={handleDownload}
              onFolderClick={handleFolderClick}
              onDownload={handleDownload}
              onShare={handleShare}
              onDelete={handleDelete}
              onRename={handleRename}
              onMove={handleMove}
              isSharedView={true} // Disable certain actions for shared files
              isUnseen={isFileUnseen}
            />
          ) : (
            <FileList
              files={filteredAndSortedFiles}
              selectedFiles={selectedFiles}
              onSelectFile={handleSelectFile}
              onSelectAll={handleSelectAll}
              onFileClick={handleDownload}
              onFolderClick={handleFolderClick}
              onDownload={handleDownload}
              onShare={handleShare}
              onDelete={handleDelete}
              onRename={handleRename}
              onMove={handleMove}
              isSharedView={true} // Disable certain actions for shared files
              isUnseen={isFileUnseen}
            />
          )}
        </>
      )}

      {/* Storage Bar */}
      {!storageLoading && storageData && (
        <div className="mt-8">
          <StorageBar used={storageData.used} total={storageData.total} />
        </div>
      )}
    </div>
  );
}
