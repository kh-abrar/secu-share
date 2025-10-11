import { useState, useCallback } from 'react';
import { useFileStore } from '@/features/files/hooks/useFiles';
import { useToast } from '@/hooks/use-toast';

interface UploadProgress {
  progress: number;
  uploading: boolean;
  error: string | null;
}

/**
 * Hook for uploading files with progress tracking and toast notifications
 */
export function useUpload() {
  const { uploadFiles, uploadFolder } = useFileStore();
  const { toast } = useToast();
  const [uploadState, setUploadState] = useState<UploadProgress>({
    progress: 0,
    uploading: false,
    error: null,
  });

  const handleUploadFiles = useCallback(
    async (files: File[], path: string = '/') => {
      setUploadState({ progress: 0, uploading: true, error: null });

      try {
        await uploadFiles(files, path, (progress) => {
          setUploadState((prev) => ({ ...prev, progress }));
        });

        setUploadState({ progress: 100, uploading: false, error: null });
        
        toast({
          title: 'Upload successful',
          description: `${files.length} file(s) uploaded successfully`,
        });

        return true;
      } catch (error: any) {
        const errorMessage = error.message || 'Upload failed';
        setUploadState({ progress: 0, uploading: false, error: errorMessage });
        
        toast({
          title: 'Upload failed',
          description: errorMessage,
          variant: 'destructive',
        });

        return false;
      }
    },
    [uploadFiles, toast]
  );

  const handleUploadFolder = useCallback(
    async (files: FileList | File[], relativePath: string = '/') => {
      setUploadState({ progress: 0, uploading: true, error: null });

      try {
        await uploadFolder(files, relativePath, (progress) => {
          setUploadState((prev) => ({ ...prev, progress }));
        });

        setUploadState({ progress: 100, uploading: false, error: null });
        
        toast({
          title: 'Folder upload successful',
          description: `Folder uploaded successfully with ${Array.from(files).length} file(s)`,
        });

        return true;
      } catch (error: any) {
        const errorMessage = error.message || 'Folder upload failed';
        setUploadState({ progress: 0, uploading: false, error: errorMessage });
        
        toast({
          title: 'Folder upload failed',
          description: errorMessage,
          variant: 'destructive',
        });

        return false;
      }
    },
    [uploadFolder, toast]
  );

  const resetUploadState = useCallback(() => {
    setUploadState({ progress: 0, uploading: false, error: null });
  }, []);

  return {
    ...uploadState,
    uploadFiles: handleUploadFiles,
    uploadFolder: handleUploadFolder,
    resetUploadState,
  };
}

