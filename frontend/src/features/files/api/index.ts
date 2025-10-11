import api from '@/libs/api';
import type { FileItem, FileListResponse, CreateFolderResponse } from '../types';

/**
 * Fetch files by path
 */
export async function fetchFilesByPath(path: string = '/'): Promise<FileItem[]> {
  const response = await api.get<FileListResponse>('/files/list', {
    params: { path },
  });
  return response.data.items || [];
}

/**
 * Fetch files shared with the current user
 */
export async function fetchSharedWithMe(): Promise<FileItem[]> {
  const response = await api.get<FileItem[]>('/files/shared-with-me');
  return response.data || [];
}

/**
 * Upload files to a specific path
 */
export async function uploadFiles(
  files: File[], 
  path: string = '/',
  onProgress?: (progress: number) => void
): Promise<void> {
  const formData = new FormData();
  
  files.forEach((file) => {
    formData.append('files', file);
  });
  
  formData.append('path', path);

  await api.post('/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      }
    },
  });
}

/**
 * Upload folder with files
 */
export async function uploadFolder(
  files: FileList | File[],
  relativePath: string = '/',
  onProgress?: (progress: number) => void
): Promise<void> {
  const formData = new FormData();
  
  Array.from(files).forEach((file: any) => {
    formData.append('files', file);
    if (file.webkitRelativePath) {
      formData.append('relativePaths', file.webkitRelativePath);
    }
  });
  
  formData.append('path', relativePath);

  await api.post('/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      }
    },
  });
}

/**
 * Delete a file
 */
export async function deleteFile(fileId: string): Promise<void> {
  await api.delete(`/files/${fileId}`);
}

/**
 * Download a file
 */
export async function downloadFile(fileId: string): Promise<Blob> {
  const response = await api.get(`/files/download/${fileId}`, {
    responseType: 'blob',
  });
  return response.data;
}

/**
 * Create a new folder
 */
export async function createFolder(name: string, path: string): Promise<CreateFolderResponse> {
  const response = await api.post<CreateFolderResponse>('/files/folder', {
    name,
    path,
  });
  return response.data;
}

/**
 * Share a file with users
 */
export async function shareFile(fileId: string, shareWith: string[]): Promise<void> {
  await api.post('/files/share', {
    fileId,
    shareWith,
  });
}

/**
 * Unshare a file
 */
export async function unshareFile(fileId: string, unshareWith: string[]): Promise<void> {
  await api.post('/files/unshare', {
    fileId,
    unshareWith,
  });
}

