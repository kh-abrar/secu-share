export interface ShareLink {
  _id: string;
  token: string;
  fileId: string;
  fileName?: string;
  createdBy: string;
  password?: string;
  expiresAt?: string;
  accessCount?: number;
  maxAccess?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShareLinkRequest {
  fileId: string;
  password?: string;
  expiresIn?: number; // in hours
  maxAccess?: number;
}

export interface CreateShareLinkResponse {
  link: ShareLink;
  url: string;
}

export interface AccessShareLinkRequest {
  token: string;
  password?: string;
}

export interface AccessShareLinkResponse {
  file: {
    _id: string;
    name: string;
    mimetype: string;
    size: number;
  };
  downloadUrl: string;
}

