import { create } from 'zustand';
import api from '@/libs/api';
import type { FileItem, FileListResponse } from '../types';

interface FileState {
  files: FileItem[];
  loading: boolean;
  error: string | null;
  uploadProgress: number;
}

interface FileActions {
  fetchFiles: (path?: string) => Promise<void>;
  fetchSharedWithMe: () => Promise<void>;
  uploadFiles: (files: File[], path?: string, onProgress?: (progress: number) => void) => Promise<void>;
  uploadFolder: (files: FileList | File[], relativePath?: string, onProgress?: (progress: number) => void) => Promise<void>;
  deleteFile: (fileId: string) => Promise<void>;
  downloadFile: (fileId: string, filename: string) => Promise<void>;
  createFolder: (name: string, path: string) => Promise<void>;
  shareFile: (fileId: string, shareWith: string[]) => Promise<void>;
  unshareFile: (fileId: string, unshareWith: string[]) => Promise<void>;
  makePublic: (fileId: string) => Promise<void>;
  clearError: () => void;
}

type FileStore = FileState & FileActions;

export const useFileStore = create<FileStore>((set, get) => ({
  // Initial state
  files: [],
  loading: false,
  error: null,
  uploadProgress: 0,

  // Actions
  fetchFiles: async (path = '/') => {
    set({ loading: true, error: null });
    try {
      const response = await api.get<FileListResponse>('/files/list', {
        params: { path },
      });
      set({ files: response.data.items || [], loading: false });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch files';
      set({ error: errorMessage, loading: false });
    }
  },

  fetchSharedWithMe: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/files/shared-with-me');
      set({ files: response.data || [], loading: false });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch shared files';
      set({ error: errorMessage, loading: false });
    }
  },

  uploadFiles: async (files, path = '/', onProgress) => {
    set({ loading: true, error: null, uploadProgress: 0 });
    try {
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
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            set({ uploadProgress: progress });
            onProgress?.(progress);
          }
        },
      });

      set({ loading: false, uploadProgress: 0 });
      
      // Refresh file list after upload
      await get().fetchFiles(path);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Upload failed';
      set({ error: errorMessage, loading: false, uploadProgress: 0 });
      throw new Error(errorMessage);
    }
  },

  uploadFolder: async (files, relativePath = '/', onProgress) => {
    set({ loading: true, error: null, uploadProgress: 0 });
    try {
      const formData = new FormData();
      
      // Handle folder upload with relative paths
      Array.from(files).forEach((file: any) => {
        formData.append('files', file);
        // If the file has a webkitRelativePath (folder upload), include it
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
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            set({ uploadProgress: progress });
            onProgress?.(progress);
          }
        },
      });

      set({ loading: false, uploadProgress: 0 });
      
      // Refresh file list after upload
      await get().fetchFiles(relativePath);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Folder upload failed';
      set({ error: errorMessage, loading: false, uploadProgress: 0 });
      throw new Error(errorMessage);
    }
  },

  deleteFile: async (fileId) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/files/${fileId}`);
      
      // Remove file from local state
      set((state) => ({
        files: state.files.filter((f) => f._id !== fileId),
        loading: false,
      }));
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to delete file';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  downloadFile: async (fileId, filename) => {
    try {
      const response = await api.get(`/files/download/${fileId}`, {
        responseType: 'blob',
      });

      // Create a download link and trigger it
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to download file';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  createFolder: async (name, path) => {
    set({ loading: true, error: null });
    try {
      await api.post('/files/folder', {
        name,
        path,
      });

      // Refresh file list after creating folder
      await get().fetchFiles(path);
      
      set({ loading: false });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to create folder';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  shareFile: async (fileId, shareWith) => {
    set({ loading: true, error: null });
    try {
      await api.post('/files/share', {
        fileId,
        shareWith,
      });
      
      set({ loading: false });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to share file';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  unshareFile: async (fileId, unshareWith) => {
    set({ loading: true, error: null });
    try {
      await api.post('/files/unshare', {
        fileId,
        unshareWith,
      });
      
      set({ loading: false });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to unshare file';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  makePublic: async (fileId) => {
    set({ loading: true, error: null });
    try {
      // This would typically set the file as public
      // Implementation depends on your backend API
      await api.post(`/files/${fileId}/public`);
      
      set({ loading: false });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to make file public';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));

