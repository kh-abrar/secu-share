import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/libs/api";
import { decryptFile, encryptFile, generateFileKey, unwrapFileKey, wrapFileKey } from "@/libs/crypto";
import { saveBlob } from "@/libs/utils";
import { useAccountKeys } from "@/features/auth/store";
import type { FileItem, FileStats, SharedFile } from "./types";

export const fileKeys = {
  all: ["files"] as const,
  folder: (path: string) => ["files", "folder", path] as const,
  folders: ["files", "folders"] as const,
  recent: ["files", "recent"] as const,
  stats: ["files", "stats"] as const,
  shared: ["shared-with-me"] as const,
  unseen: ["shared-with-me", "unseen"] as const,
};

// ---------- queries ----------

export function useFolder(path: string) {
  return useQuery({
    queryKey: fileKeys.folder(path),
    queryFn: async () => (await api.get<{ items: FileItem[] }>("/files", { params: { path } })).data.items,
  });
}

export function useAllFolders(enabled = true) {
  return useQuery({
    queryKey: fileKeys.folders,
    queryFn: async () => (await api.get<{ folders: FileItem[] }>("/files/folders")).data.folders,
    enabled,
  });
}

export function useRecentFiles(limit = 5) {
  return useQuery({
    queryKey: [...fileKeys.recent, limit],
    queryFn: async () => (await api.get<{ files: FileItem[] }>("/files/recent", { params: { limit } })).data.files,
  });
}

export function useFileStats() {
  return useQuery({
    queryKey: fileKeys.stats,
    queryFn: async () => (await api.get<FileStats>("/files/stats")).data,
  });
}

export function useSharedWithMe(enabled = true) {
  return useQuery({
    queryKey: fileKeys.shared,
    queryFn: async () => (await api.get<{ files: SharedFile[] }>("/shared-with-me")).data.files,
    enabled,
  });
}

export function useUnseenCount(enabled: boolean) {
  return useQuery({
    queryKey: fileKeys.unseen,
    queryFn: async () => (await api.get<{ count: number }>("/shared-with-me/unseen-count")).data.count,
    enabled,
    refetchInterval: 60_000,
  });
}

// ---------- encryption helpers ----------

/** Decrypts this user's copy of a file's key. */
export function useFileKey() {
  const { privateKey } = useAccountKeys();
  return (file: Pick<FileItem, "wrappedKey">) => {
    if (!file.wrappedKey) throw new Error("This file has no key");
    return unwrapFileKey(file.wrappedKey, privateKey);
  };
}

/** Downloads a file's ciphertext and decrypts it in the browser. */
export function useDecryptedContent() {
  const getKey = useFileKey();
  return async (file: FileItem, onProgress?: (fraction: number) => void) => {
    const [key, { data }] = await Promise.all([
      getKey(file),
      api.get<Blob>(`/files/${file._id}/content`, {
        responseType: "blob",
        onDownloadProgress: (e) => e.total && onProgress?.(0.9 * (e.loaded / e.total)),
      }),
    ]);
    return decryptFile(data, key, file.mimetype || "application/octet-stream", (f) => onProgress?.(0.9 + 0.1 * f));
  };
}

export function useDownloadFile() {
  const getContent = useDecryptedContent();
  return async (file: FileItem) => saveBlob(await getContent(file), file.name);
}

// ---------- mutations ----------

function useInvalidateFiles() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: fileKeys.all });
}

export interface UploadItem {
  file: File;
  /** Destination folder, "/" or "/a/b/" */
  path: string;
}

/** Encrypts each file with a fresh key, then uploads the ciphertext. */
export function useUploadFiles() {
  const { publicKey } = useAccountKeys();
  const invalidate = useInvalidateFiles();

  return useMutation({
    mutationFn: async ({
      items,
      onProgress,
    }: {
      items: UploadItem[];
      onProgress?: (done: number, total: number, current: string) => void;
    }) => {
      const uploaded: { item: UploadItem; file: FileItem; fileKey: CryptoKey }[] = [];
      const failed: { item: UploadItem; error: unknown }[] = [];
      const totalBytes = items.reduce((n, i) => n + i.file.size, 0) || 1;
      let doneBytes = 0;

      for (const item of items) {
        try {
          const fileKey = await generateFileKey();
          const encrypted = await encryptFile(item.file, fileKey, (f) =>
            onProgress?.(doneBytes + 0.3 * f * item.file.size, totalBytes, item.file.name)
          );
          const form = new FormData();
          form.append("name", item.file.name);
          form.append("path", item.path);
          form.append("mimetype", item.file.type || "application/octet-stream");
          form.append("size", String(item.file.size));
          form.append("wrappedKey", await wrapFileKey(fileKey, publicKey));
          form.append("file", encrypted, "encrypted.bin");

          const { data } = await api.post<FileItem>("/files", form, {
            onUploadProgress: (e) =>
              e.total && onProgress?.(doneBytes + (0.3 + 0.7 * (e.loaded / e.total)) * item.file.size, totalBytes, item.file.name),
          });
          uploaded.push({ item, file: data, fileKey });
        } catch (error) {
          failed.push({ item, error });
        }
        doneBytes += item.file.size;
        onProgress?.(doneBytes, totalBytes, item.file.name);
      }
      return { uploaded, failed };
    },
    onSettled: invalidate,
  });
}

export function useCreateFolder() {
  const invalidate = useInvalidateFiles();
  return useMutation({
    mutationFn: async ({ name, path }: { name: string; path: string }) =>
      (await api.post<FileItem>("/files/folders", { name, path })).data,
    onSuccess: invalidate,
  });
}

export function useUpdateItem() {
  const invalidate = useInvalidateFiles();
  return useMutation({
    mutationFn: async ({ id, ...changes }: { id: string; name?: string; path?: string }) =>
      (await api.patch<FileItem>(`/files/${id}`, changes)).data,
    onSuccess: invalidate,
  });
}

export function useDeleteItems() {
  const invalidate = useInvalidateFiles();
  return useMutation({
    mutationFn: async (ids: string[]) => (await api.post<{ deleted: number }>("/files/bulk-delete", { ids })).data,
    onSuccess: invalidate,
  });
}

export function useRemoveSharedFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shareId: string) => api.delete(`/shared-with-me/${shareId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: fileKeys.shared }),
  });
}
