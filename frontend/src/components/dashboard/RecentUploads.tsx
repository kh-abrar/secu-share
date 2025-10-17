import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileIcon } from "@/components/common/FileIcon";
import type { FileItem } from "@/features/files/types";

interface RecentUploadsProps {
  files: FileItem[];
  onFileClick?: (file: FileItem) => void;
  onViewAll?: () => void;
}

export function RecentUploads({ files, onFileClick, onViewAll }: RecentUploadsProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <Card className="p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent Uploads</h3>
        {onViewAll && (
          <Button variant="ghost" size="sm" onClick={onViewAll}>
            View All
          </Button>
        )}
      </div>
      
      {files.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="text-gray-500">No recent uploads</p>
        </div>
      ) : (
        <div className="space-y-3 flex-1">
          {files.slice(0, 5).map((file) => (
            <div 
              key={file._id}
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onFileClick?.(file)}
            >
              <div className="flex-shrink-0">
                <FileIcon 
                  type={file.type} 
                  mimetype={file.mimetype} 
                  className="w-8 h-8" 
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.name}
                </p>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span>{formatFileSize(file.size)}</span>
                  <span>•</span>
                  <span>{formatDate(file.createdAt)}</span>
                </div>
              </div>
              {file.type === 'file' && (
                <div className="flex-shrink-0">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
