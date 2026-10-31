export type LinkScope = "public" | "restricted";
export type LinkExpiry = "1h" | "24h" | "7d" | "30d" | "never";

export interface ShareLink {
  id: string;
  token: string;
  fileId: string;
  scope: LinkScope;
  allowedEmails: string[];
  hasPassword: boolean;
  expiresAt: string | null;
  maxDownloads: number | null;
  downloadCount: number;
  expired: boolean;
  createdAt: string;
}

export interface Recipient {
  recipientId: string;
  name: string;
  email: string;
  sharedAt: string;
}

export interface CreateLinkInput {
  scope: LinkScope;
  emails: string[];
  password?: string;
  expiresIn: LinkExpiry;
  maxDownloads: number | null;
}

export interface PublicLinkInfo {
  file: { name: string; mimetype: string | null; size: number | null };
  owner: { name: string };
  scope: LinkScope;
  expiresAt: string | null;
  downloadsRemaining: number | null;
}

export const EXPIRY_LABELS: Record<LinkExpiry, string> = {
  "1h": "1 hour",
  "24h": "24 hours",
  "7d": "7 days",
  "30d": "30 days",
  never: "Never",
};
