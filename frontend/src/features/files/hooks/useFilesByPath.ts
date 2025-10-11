import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFileStore } from './useFiles';
import api from '@/libs/api';

/**
 * React Query hook to fetch files by path
 */
export function useFilesByPath(path: string = '/') {
  const fetchFiles = useFileStore((state) => state.fetchFiles);

  return useQuery({
    queryKey: ['files', path],
    queryFn: async () => {
      await fetchFiles(path);
      return useFileStore.getState().files;
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
}

/**
 * React Query hook to fetch shared files
 */
export function useSharedWithMe() {
  const fetchSharedWithMe = useFileStore((state) => state.fetchSharedWithMe);

  return useQuery({
    queryKey: ['files', 'shared-with-me'],
    queryFn: async () => {
      await fetchSharedWithMe();
      return useFileStore.getState().files;
    },
    staleTime: 30000,
  });
}

/**
 * React Query mutation hook for uploading files
 */
export function useUploadFiles() {
  const queryClient = useQueryClient();
  const uploadFiles = useFileStore((state) => state.uploadFiles);

  return useMutation({
    mutationFn: ({ 
      files, 
      path,
      onProgress 
    }: { 
      files: File[]; 
      path?: string;
      onProgress?: (progress: number) => void;
    }) => {
      return uploadFiles(files, path, onProgress);
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch files for the path
      queryClient.invalidateQueries({ queryKey: ['files', variables.path || '/'] });
    },
  });
}

/**
 * React Query mutation hook for uploading folder
 */
export function useUploadFolder() {
  const queryClient = useQueryClient();
  const uploadFolder = useFileStore((state) => state.uploadFolder);

  return useMutation({
    mutationFn: ({ 
      files, 
      relativePath,
      onProgress 
    }: { 
      files: FileList | File[]; 
      relativePath?: string;
      onProgress?: (progress: number) => void;
    }) => {
      return uploadFolder(files, relativePath, onProgress);
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch files for the path
      queryClient.invalidateQueries({ queryKey: ['files', variables.relativePath || '/'] });
    },
  });
}

/**
 * React Query mutation hook for deleting a file
 */
export function useDeleteFile() {
  const queryClient = useQueryClient();
  const deleteFile = useFileStore((state) => state.deleteFile);

  return useMutation({
    mutationFn: (fileId: string) => deleteFile(fileId),
    onSuccess: () => {
      // Invalidate all file queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

/**
 * React Query mutation hook for creating a folder
 */
export function useCreateFolder() {
  const queryClient = useQueryClient();
  const createFolder = useFileStore((state) => state.createFolder);

  return useMutation({
    mutationFn: ({ name, path }: { name: string; path: string }) => {
      return createFolder(name, path);
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch files for the path
      queryClient.invalidateQueries({ queryKey: ['files', variables.path] });
    },
  });
}

/**
 * React Query mutation hook for sharing a file
 */
export function useShareFile() {
  const queryClient = useQueryClient();
  const shareFile = useFileStore((state) => state.shareFile);

  return useMutation({
    mutationFn: ({ fileId, shareWith }: { fileId: string; shareWith: string[] }) => {
      return shareFile(fileId, shareWith);
    },
    onSuccess: () => {
      // Invalidate all file queries to refresh the list with updated share status
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

/**
 * React Query mutation hook for unsharing a file
 */
export function useUnshareFile() {
  const queryClient = useQueryClient();
  const unshareFile = useFileStore((state) => state.unshareFile);

  return useMutation({
    mutationFn: ({ fileId, unshareWith }: { fileId: string; unshareWith: string[] }) => {
      return unshareFile(fileId, unshareWith);
    },
    onSuccess: () => {
      // Invalidate all file queries to refresh the list with updated share status
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

/**
 * React Query mutation hook for downloading a file
 */
export function useDownloadFile() {
  const downloadFile = useFileStore((state) => state.downloadFile);

  return useMutation({
    mutationFn: ({ fileId, filename }: { fileId: string; filename: string }) => {
      return downloadFile(fileId, filename);
    },
  });
}

/**
 * React Query hook for fetching storage usage
 */
export function useStorageUsage() {
  return useQuery({
    queryKey: ['storage-usage'],
    queryFn: async () => {
      const response = await api.get('/files/storage');
      return response.data;
    },
    staleTime: 60000, // Cache for 1 minute
    refetchOnWindowFocus: false,
  });
}
