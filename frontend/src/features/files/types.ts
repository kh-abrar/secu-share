export interface FileItem {
  _id: string;
  type: "file" | "folder";
  name: string;
  /** Parent folder: "/" or "/a/b/" */
  path: string;
  mimetype: string | null;
  /** Plaintext size in bytes */
  size: number | null;
  /** File key wrapped for the current user */
  wrappedKey: string | null;
  createdAt: string;
  updatedAt: string;
  /** Present in folder listings */
  linkCount?: number;
  recipientCount?: number;
}

export interface SharedFile extends FileItem {
  shareId: string;
  owner: { name: string; email: string };
  sharedAt: string;
  seen: boolean;
}

export interface FileStats {
  files: number;
  folders: number;
  sharedFiles: number;
  used: number;
  quota: number;
}

export const folderPathOf = (folder: Pick<FileItem, "path" | "name">) => `${folder.path}${folder.name}/`;

export const isShared = (f: FileItem) => (f.linkCount ?? 0) + (f.recipientCount ?? 0) > 0;
