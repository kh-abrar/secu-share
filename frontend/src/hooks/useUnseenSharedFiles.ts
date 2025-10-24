import { useQuery } from '@tanstack/react-query';
import api from '@/libs/api';
import type { FileItem } from '@/features/files/types';

interface UnseenShareLink {
  token: string;
  file: FileItem;
  createdBy: { name: string; email: string };
  createdAt: string;
  expiresAt: string | null;
}

export function useUnseenSharedFiles() {
  return useQuery({
    queryKey: ['unseenSharedFiles'],
    queryFn: async () => {
      const response = await api.get<{ unseen: number; unseenLinks: UnseenShareLink[] }>('/share/unseen');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Refetch every 1 minute
  });
}
