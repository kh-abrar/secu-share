export interface FileItem {
  _id: string;
  type: 'file' | 'folder';
  name: string;
  path: string;
  owner: string;
  filename?: string;
  originalName?: string;
  mimetype?: string;
  size?: number;
  isPublic?: boolean;
  sharedWith?: string[];
  encryptionType?: string | null;
  iv?: string | null;
  encryptedKey?: string | null;
  accessLevel?: 'private' | 'shared' | 'public';
  createdAt?: string;
  updatedAt?: string;
  url?: string; // For image previews
  shareUrl?: string; // For share links
  shareLinkInfo?: {
    token: string;
    requiresPassword: boolean;
  } | null;
  hasShareLink?: boolean;
  shareScope?: string;
  ownerEmail?: string;
  ownerName?: string;
}

export interface FileListResponse {
  items: FileItem[];
}

export interface CreateFolderRequest {
  name: string;
  path: string;
}

export interface CreateFolderResponse {
  _id: string;
  type: 'folder';
  name: string;
  path: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
}
