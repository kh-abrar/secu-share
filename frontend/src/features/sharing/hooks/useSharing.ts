import { create } from 'zustand';
import api from '@/libs/api';
import type { 
  ShareLink, 
  CreateShareLinkRequest, 
  CreateShareLinkResponse,
  AccessShareLinkRequest,
  AccessShareLinkResponse 
} from '../types';

interface SharingState {
  shareLinks: ShareLink[];
  currentShare: AccessShareLinkResponse | null;
  loading: boolean;
  error: string | null;
}

interface SharingActions {
  createShareLink: (request: CreateShareLinkRequest) => Promise<CreateShareLinkResponse>;
  deleteShareLink: (token: string) => Promise<void>;
  accessShareLink: (request: AccessShareLinkRequest) => Promise<AccessShareLinkResponse>;
  fetchUserShareLinks: () => Promise<void>;
  clearError: () => void;
  clearCurrentShare: () => void;
}

type SharingStore = SharingState & SharingActions;

export const useSharingStore = create<SharingStore>((set) => ({
  // Initial state
  shareLinks: [],
  currentShare: null,
  loading: false,
  error: null,

  // Actions
  createShareLink: async (request) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post<CreateShareLinkResponse>('/share/create', request);
      
      // Add the new share link to the list
      set((state) => ({
        shareLinks: [...state.shareLinks, response.data.link],
        loading: false,
      }));
      
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to create share link';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  deleteShareLink: async (token) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/share/delete/${token}`);
      
      // Remove the share link from local state
      set((state) => ({
        shareLinks: state.shareLinks.filter((link) => link.token !== token),
        loading: false,
      }));
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to delete share link';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  accessShareLink: async (request) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post<AccessShareLinkResponse>(
        `/share/access/${request.token}`,
        request.password ? { password: request.password } : {}
      );
      
      set({ 
        currentShare: response.data,
        loading: false 
      });
      
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to access share link';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  fetchUserShareLinks: async () => {
    set({ loading: true, error: null });
    try {
      // This assumes you have an endpoint to fetch user's share links
      // Adjust the endpoint based on your backend implementation
      const response = await api.get<ShareLink[]>('/share/my-links');
      
      set({ 
        shareLinks: response.data,
        loading: false 
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch share links';
      set({ error: errorMessage, loading: false });
    }
  },

  clearError: () => {
    set({ error: null });
  },

  clearCurrentShare: () => {
    set({ currentShare: null });
  },
}));

