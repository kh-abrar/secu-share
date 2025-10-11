import { useState } from 'react';
import { useFilesByPath, useCreateFolder } from '../hooks/useFilesByPath';
import type { FileItem } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQueryClient } from '@tanstack/react-query';
import FileCard from './FileCard';

interface BreadcrumbProps {
  path: string;
  onNavigate: (path: string) => void;
}

function Breadcrumb({ path, onNavigate }: BreadcrumbProps) {
  const parts = path.split('/').filter(Boolean);
  const crumbs = [{ name: 'Home', path: '/' }];
  
  let currentPath = '';
  parts.forEach(part => {
    currentPath += `/${part}`;
    crumbs.push({ name: part, path: currentPath });
  });

  return (
    <div className="flex items-center space-x-2 mb-4 text-sm">
      {crumbs.map((crumb, i) => (
        <div key={crumb.path} className="flex items-center">
          {i > 0 && <span className="mx-2 text-gray-500">/</span>}
          <button
            onClick={() => onNavigate(crumb.path)}
            className="hover:underline text-blue-600"
          >
            {crumb.name}
          </button>
        </div>
      ))}
    </div>
  );
}

interface NewFolderDialogProps {
  currentPath: string;
  onSuccess: () => void;
}

function NewFolderDialog({ currentPath, onSuccess }: NewFolderDialogProps) {
  const [open, setOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const createFolderMutation = useCreateFolder();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    
    try {
      await createFolderMutation.mutateAsync({ 
        name: folderName.trim(), 
        path: currentPath 
      });
      setFolderName('');
      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">New Folder</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="folderName" className="text-sm font-medium">
              Folder Name
            </label>
            <Input
              id="folderName"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Enter folder name"
              required
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={createFolderMutation.isPending}>
              {createFolderMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function FilesBrowser() {
  const [currentPath, setCurrentPath] = useState('/');
  const { data: files, isLoading, error } = useFilesByPath(currentPath);
  const queryClient = useQueryClient();

  const handleFolderClick = (folder: FileItem) => {
    if (folder.type === 'folder') {
      const newPath = `${folder.path}${folder.name}/`;
      setCurrentPath(newPath);
    }
  };

  const handleBreadcrumbNavigate = (path: string) => {
    setCurrentPath(path.endsWith('/') ? path : `${path}/`);
  };

  const handleFolderCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['files', 'list', currentPath] });
  };

  if (isLoading) {
    return <div className="p-8">Loading files...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">Error loading files</div>;
  }

  const folders = files?.filter(f => f.type === 'folder') || [];
  const fileItems = files?.filter(f => f.type === 'file') || [];

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <Breadcrumb path={currentPath} onNavigate={handleBreadcrumbNavigate} />
        <NewFolderDialog currentPath={currentPath} onSuccess={handleFolderCreated} />
      </div>

      {files && files.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          This folder is empty
        </div>
      ) : (
        <div>
          {folders.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">Folders</h2>
              <div className="space-y-2">
                {folders.map(folder => (
                  <div
                    key={folder._id}
                    onClick={() => handleFolderClick(folder)}
                    className="cursor-pointer"
                  >
                    <FileCard file={folder} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {fileItems.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Files</h2>
              <div className="space-y-2">
                {fileItems.map(file => (
                  <FileCard key={file._id} file={file} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
