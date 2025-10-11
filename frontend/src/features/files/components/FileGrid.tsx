import { File as FileIcon, Download, Share2, Trash2, MoreVertical, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ImageThumbnail } from './ImageThumbnail';
import type { FileItem } from '@/features/files/types';

interface FileGridProps {
  files: FileItem[];
  selectedFiles: string[];
  onSelectFile: (fileId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onFolderClick: (folder: FileItem) => void;
  onDownload: (file: FileItem) => void;
  onShare: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
  onRename: (file: FileItem) => void;
}

export function FileGrid({
  files,
  selectedFiles,
  onSelectFile,
  onSelectAll,
  onFolderClick,
  onDownload,
  onShare,
  onDelete,
  onRename
}: FileGridProps) {
  const allSelected = files.length > 0 && files.every(file => selectedFiles.includes(file._id));
  const someSelected = selectedFiles.length > 0;


  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  const isShared = (file: FileItem) => {
    return file.sharedWith && file.sharedWith.length > 0;
  };

  return (
    <div className="p-4">
      {/* Select all checkbox */}
      {files.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <Checkbox
            checked={allSelected}
              ref={(el) => {
                if (el) (el as any).indeterminate = someSelected && !allSelected;
              }}
            onCheckedChange={onSelectAll}
          />
          <span className="text-sm text-neutral-600">
            {someSelected ? `${selectedFiles.length} selected` : 'Select all'}
          </span>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {files.map((file) => (
          <div
            key={file._id}
            className={`group relative p-3 rounded-lg border-2 transition-all cursor-pointer ${
              selectedFiles.includes(file._id)
                ? 'border-blue-500 bg-blue-50'
                : 'border-neutral-200 hover:border-neutral-300 hover:shadow-sm'
            }`}
            onClick={() => file.type === 'folder' ? onFolderClick(file) : onSelectFile(file._id, !selectedFiles.includes(file._id))}
          >
            {/* Selection checkbox */}
            <div className="absolute top-2 left-2">
              <Checkbox
                checked={selectedFiles.includes(file._id)}
                onCheckedChange={(checked) => onSelectFile(file._id, checked as boolean)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* File icon/thumbnail */}
            <div className="flex flex-col items-center text-center pt-6">
              <div className="mb-2">
                <ImageThumbnail file={file} size="md" />
              </div>

              {/* File name */}
              <div className="w-full">
                <p className="text-xs font-medium text-neutral-900 truncate mb-1" title={file.name}>
                  {file.name}
                </p>
                
                {/* File info */}
                <div className="text-xs text-neutral-500 space-y-1">
                  {file.type === 'file' && (
                    <>
                      <p>{formatSize(file.size)}</p>
                      <p>{formatDate(file.createdAt)}</p>
                    </>
                  )}
                </div>

                {/* Badges */}
                <div className="mt-2 flex justify-center">
                  {isShared(file) && (
                    <Badge variant="secondary" className="text-xs px-1 py-0">
                      <Users className="h-3 w-3 mr-1" />
                      Shared
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Action menu */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {file.type === 'file' && (
                    <>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDownload(file); }}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShare(file); }}>
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(file); }}>
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => { e.stopPropagation(); onDelete(file); }}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {files.length === 0 && (
        <div className="text-center py-12">
          <FileIcon className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 mb-2">No files yet</h3>
          <p className="text-neutral-500">Upload something to get started!</p>
        </div>
      )}
    </div>
  );
}
