import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/libs/api";
import { exportFileKey, importPublicKey, wrapFileKey } from "@/libs/crypto";
import { fileKeys } from "@/features/files/hooks";
import type { CreateLinkInput, Recipient, ShareLink } from "./types";

const linkKeys = (fileId: string) => ["files", fileId, "links"] as const;
const recipientKeys = (fileId: string) => ["files", fileId, "recipients"] as const;

/** The full link. The key is in the fragment, which browsers never send to servers. */
export async function buildShareUrl(token: string, fileKey: CryptoKey) {
  return `${window.location.origin}/share/${token}#${await exportFileKey(fileKey)}`;
}

export function useFileLinks(fileId: string) {
  return useQuery({
    queryKey: linkKeys(fileId),
    queryFn: async () => (await api.get<{ links: ShareLink[] }>(`/files/${fileId}/links`)).data.links,
  });
}

export function useFileRecipients(fileId: string) {
  return useQuery({
    queryKey: recipientKeys(fileId),
    queryFn: async () => (await api.get<{ recipients: Recipient[] }>(`/files/${fileId}/shares`)).data.recipients,
  });
}

function useInvalidate(fileId: string) {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["files", fileId] }),
      qc.invalidateQueries({ queryKey: fileKeys.all }),
    ]);
}

export async function createLink(fileId: string, input: CreateLinkInput) {
  return (await api.post<ShareLink>(`/files/${fileId}/links`, input)).data;
}

export function useCreateLink(fileId: string) {
  const invalidate = useInvalidate(fileId);
  return useMutation({ mutationFn: (input: CreateLinkInput) => createLink(fileId, input), onSuccess: invalidate });
}

export function useRevokeLink(fileId: string) {
  const invalidate = useInvalidate(fileId);
  return useMutation({ mutationFn: (linkId: string) => api.delete(`/links/${linkId}`), onSuccess: invalidate });
}

export class RecipientNotFoundError extends Error {}

/**
 * Shares a file with a registered, verified user: looks up their public key and
 * wraps the file key for them. The server never sees the file key.
 */
export async function shareWithUser(fileId: string, fileKey: CryptoKey, email: string) {
  let target: { id: string; publicKey: string; name: string; email: string };
  try {
    target = (await api.get("/users/lookup", { params: { email } })).data;
  } catch {
    throw new RecipientNotFoundError(`${email} doesn't have a verified SecuShare account`);
  }
  const wrappedKey = await wrapFileKey(fileKey, await importPublicKey(target.publicKey));
  return (await api.post<Recipient>(`/files/${fileId}/shares`, { recipientId: target.id, wrappedKey })).data;
}

export function useShareWithUser(fileId: string) {
  const invalidate = useInvalidate(fileId);
  return useMutation({
    mutationFn: ({ fileKey, email }: { fileKey: CryptoKey; email: string }) => shareWithUser(fileId, fileKey, email),
    onSuccess: invalidate,
  });
}

export function useRemoveRecipient(fileId: string) {
  const invalidate = useInvalidate(fileId);
  return useMutation({
    mutationFn: (recipientId: string) => api.delete(`/files/${fileId}/shares/${recipientId}`),
    onSuccess: invalidate,
  });
}
