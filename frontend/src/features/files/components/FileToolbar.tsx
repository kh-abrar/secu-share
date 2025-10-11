import React from 'react';
import { Search, Filter, ArrowUpDown, FolderPlus, LayoutGrid, List, Trash2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import UploadModal from '@/features/upload/components/UploadModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input as DialogInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'images' | 'documents' | 'videos' | 'shared' | 'private';
type SortType = 'name' | 'date' | 'size';

interface FileToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  sort: SortType;
  onSortChange: (sort: SortType) => void;
  selectedCount: number;
  onBulkDelete: () => void;
  onBulkShare: () => void;
  onCreateFolder: (name: string) => void;
}

export function FileToolbar({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  sort,
  onSortChange,
  selectedCount,
  onBulkDelete,
  onBulkShare,
  onCreateFolder
}: FileToolbarProps) {
  const [newFolderOpen, setNewFolderOpen] = React.useState(false);
  const [folderName, setFolderName] = React.useState('');

  const handleCreateFolder = () => {
    if (folderName.trim()) {
      onCreateFolder(folderName.trim());
      setFolderName('');
      setNewFolderOpen(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 p-4 bg-white border-b border-neutral-200">
      {/* Left section: Search and filters */}
      <div className="flex flex-1 gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter */}
        <Select value={filter} onValueChange={onFilterChange}>
          <SelectTrigger className="w-[140px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All files</SelectItem>
            <SelectItem value="images">Images</SelectItem>
            <SelectItem value="documents">Documents</SelectItem>
            <SelectItem value="videos">Videos</SelectItem>
            <SelectItem value="shared">Shared</SelectItem>
            <SelectItem value="private">Private</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sort} onValueChange={onSortChange}>
          <SelectTrigger className="w-[140px]">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="size">Size</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Right section: Actions and view toggle */}
      <div className="flex items-center gap-2">
        {/* Bulk actions */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 mr-4">
            <span className="text-sm text-neutral-600">{selectedCount} selected</span>
            <Button size="sm" variant="outline" onClick={onBulkShare}>
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
            <Button size="sm" variant="outline" onClick={onBulkDelete} className="text-red-600 hover:text-red-700">
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        )}

        {/* Upload and New Folder */}
        <UploadModal />
        
        <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <FolderPlus className="h-4 w-4 mr-1" />
              New Folder
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Folder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="folder-name">Folder Name</Label>
                <DialogInput
                  id="folder-name"
                  placeholder="Enter folder name"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateFolder();
                    }
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setNewFolderOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateFolder} disabled={!folderName.trim()}>
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* View toggle */}
        <div className="flex border border-neutral-200 rounded-md">
          <Button
            size="sm"
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            onClick={() => onViewModeChange('grid')}
            className="rounded-r-none border-r"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            onClick={() => onViewModeChange('list')}
            className="rounded-l-none"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
