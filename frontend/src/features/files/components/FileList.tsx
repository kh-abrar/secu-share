import { File as LucideFileIcon, Download, Share2, Trash2, MoreVertical, Users, Edit3, FolderInput } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ImageThumbnail } from './ImageThumbnail';
import { formatFileSize, formatDate } from '@/libs/utils';
import type { FileItem } from '@/features/files/types';

interface FileListProps {
  files: FileItem[];
  selectedFiles: string[];
  onSelectFile: (fileId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onFolderClick: (folder: FileItem) => void;
  onDownload: (file: FileItem) => void;
  onShare: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
  onRename: (file: FileItem) => void;
  onMove: (file: FileItem) => void;
}

export function FileList({
  files,
  selectedFiles,
  onSelectFile,
  onSelectAll,
  onFolderClick,
  onDownload,
  onShare,
  onDelete,
  onRename,
  onMove
}: FileListProps) {
  const allSelected = files.length > 0 && files.every(file => selectedFiles.includes(file._id));
  const someSelected = selectedFiles.length > 0;




  const isShared = (file: FileItem) => {
    return file.sharedWith && file.sharedWith.length > 0;
  };

  return (
    <div className="p-4">
      {/* Table header */}
      <div className="border-b border-neutral-200 mb-4">
        <div className="grid grid-cols-12 gap-4 py-3 px-4 text-sm font-medium text-neutral-600">
          <div className="col-span-1">
            <Checkbox
              checked={allSelected}
              ref={(el) => {
                if (el) (el as any).indeterminate = someSelected && !allSelected;
              }}
              onCheckedChange={onSelectAll}
            />
          </div>
          <div className="col-span-5">Name</div>
          <div className="col-span-2">Size</div>
          <div className="col-span-2">Uploaded</div>
          <div className="col-span-1">Shared</div>
          <div className="col-span-1">Actions</div>
        </div>
      </div>

      {/* File rows */}
      <div className="space-y-1">
        {files.map((file) => (
          <div
            key={file._id}
            className={`grid grid-cols-12 gap-4 py-3 px-4 rounded-lg transition-smooth ${
              selectedFiles.includes(file._id)
                ? 'bg-blue-50 border border-blue-200'
                : 'hover:bg-neutral-50'
            }`}
          >
            {/* Checkbox */}
            <div className="col-span-1 flex items-center">
              <Checkbox
                checked={selectedFiles.includes(file._id)}
                onCheckedChange={(checked) => onSelectFile(file._id, checked as boolean)}
              />
            </div>

            {/* File name and icon/thumbnail */}
            <div className="col-span-5 flex items-center gap-3">
              <div className="flex-shrink-0">
                <ImageThumbnail file={file} size="sm" />
              </div>
              <div className="min-w-0 flex-1">
                <button
                  className={`text-left truncate hover:bg-accent/20 px-2 py-1 rounded transition-colors ${
                    file.type === 'folder' 
                      ? 'font-semibold text-neutral-900 hover:text-blue-600' 
                      : 'font-medium text-neutral-900'
                  }`}
                  onClick={() => file.type === 'folder' && onFolderClick(file)}
                  title={file.name}
                >
                  {file.name}
                </button>
                {file.type === 'file' && file.mimetype && (
                  <p className="text-xs text-neutral-500 truncate">{file.mimetype}</p>
                )}
              </div>
            </div>

            {/* Size */}
            <div className="col-span-2 flex items-center text-sm text-neutral-600">
              {file.type === 'file' ? formatFileSize(file.size) : '-'}
            </div>

            {/* Uploaded date */}
            <div className="col-span-2 flex items-center text-sm text-neutral-500">
              {formatDate(file.createdAt)}
            </div>

            {/* Shared status */}
            <div className="col-span-1 flex items-center">
              {isShared(file) ? (
                <Badge variant="secondary" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  Shared
                </Badge>
              ) : (
                <span className="text-xs text-neutral-400">-</span>
              )}
            </div>

            {/* Actions */}
            <div className="col-span-1 flex items-center justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {file.type === 'file' && (
                    <>
                      <DropdownMenuItem onClick={() => onDownload(file)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onShare(file)}>
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem onClick={() => onRename(file)}>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onMove(file)}>
                    <FolderInput className="h-4 w-4 mr-2" />
                    Move
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(file)}
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
          <LucideFileIcon className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 mb-2">📁 No files yet</h3>
          <p className="text-neutral-500">Upload files to get started.</p>
        </div>
      )}
    </div>
  );
}
