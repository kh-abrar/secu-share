# Frontend-Backend Integration Guide

This guide explains how the frontend is connected to the backend API and how to use the various stores and hooks.

## Architecture Overview

The frontend uses:
- **Axios** for HTTP requests with session-based authentication
- **Zustand** for global state management
- **React Query** for server state management and caching
- **React Router** for navigation

## API Configuration

### Base API Client (`src/libs/api.ts`)

```typescript
import api from '@/libs/api';

// All requests automatically include:
// - baseURL: http://localhost:4000/api
// - withCredentials: true (for session cookies)
// - Automatic 401 error handling
```

The API client automatically:
1. Sends session cookies with every request
2. Handles 401 errors by clearing auth state
3. Sets proper headers for JSON and multipart requests

## Authentication

### Auth Store (`src/hooks/useAuth.ts`)

Zustand store that manages authentication state:

```typescript
import { useAuthStore } from '@/hooks/useAuth';

const { 
  user,           // Current user object or null
  loading,        // Loading state
  isAuthenticated,// Boolean auth status
  error,          // Error message
  login,          // (credentials) => Promise<void>
  logout,         // () => Promise<void>
  register,       // (credentials) => Promise<void>
  fetchUser,      // () => Promise<void>
  clearError      // () => void
} = useAuthStore();
```

### Auth Provider (`src/app/providers/auth-provider.tsx`)

React context that wraps the Zustand store:

```typescript
import { useAuth } from '@/app/providers/auth-provider';

const { user, loading, login, logout, signup } = useAuth();
```

### Protected Routes

All dashboard routes are protected using `ProtectedRoute`:

```typescript
// Automatically redirects to /login if not authenticated
<ProtectedRoute>
  <YourComponent />
</ProtectedRoute>
```

### Login Flow

1. User submits credentials on `/login`
2. `login()` calls `POST /api/auth/login`
3. Backend sets session cookie
4. `fetchUser()` calls `GET /api/auth/me` to get user data
5. User is redirected to `/dashboard`

### Logout Flow

1. User clicks logout
2. `logout()` calls `POST /api/auth/logout`
3. Backend clears session
4. Frontend clears user state
5. User is redirected to `/login`

### Session Expiry

When a 401 error occurs:
1. Axios interceptor detects it
2. Auth store's `handleUnauthorized()` is called
3. User state is cleared
4. User is redirected to `/login` with error message

## File Management

### Files Store (`src/features/files/hooks/useFiles.ts`)

Zustand store for file operations:

```typescript
import { useFileStore } from '@/features/files/hooks/useFiles';

const {
  files,          // Array of FileItem
  loading,        // Loading state
  error,          // Error message
  uploadProgress, // Upload progress (0-100)
  
  // Actions
  fetchFiles,         // (path) => Promise<void>
  fetchSharedWithMe,  // () => Promise<void>
  uploadFiles,        // (files, path, onProgress) => Promise<void>
  uploadFolder,       // (files, relativePath, onProgress) => Promise<void>
  deleteFile,         // (fileId) => Promise<void>
  downloadFile,       // (fileId, filename) => Promise<void>
  createFolder,       // (name, path) => Promise<void>
  shareFile,          // (fileId, shareWith) => Promise<void>
  unshareFile,        // (fileId, unshareWith) => Promise<void>
} = useFileStore();
```

### React Query Hooks (`src/features/files/hooks/useFilesByPath.ts`)

For better server state management:

```typescript
import { 
  useFilesByPath,
  useSharedWithMe,
  useUploadFiles,
  useDeleteFile,
  useCreateFolder,
  useDownloadFile
} from '@/features/files/hooks/useFilesByPath';

// Fetch files with automatic caching
const { data: files, isLoading, error } = useFilesByPath('/my-folder/');

// Upload files with mutation
const uploadMutation = useUploadFiles();
await uploadMutation.mutateAsync({ files, path: '/uploads/' });

// Delete file
const deleteMutation = useDeleteFile();
await deleteMutation.mutateAsync(fileId);
```

### Upload Hook with Progress (`src/features/upload/hooks/useUpload.ts`)

```typescript
import { useUpload } from '@/features/upload/hooks/useUpload';

const { 
  progress,      // Current upload progress
  uploading,     // Upload in progress
  error,         // Error message
  uploadFiles,   // Upload multiple files
  uploadFolder,  // Upload folder with structure
} = useUpload();

// Upload files
await uploadFiles([file1, file2], '/destination/');

// Upload folder
const folderInput = document.getElementById('folder-input');
await uploadFolder(folderInput.files, '/destination/');
```

## Sharing

### Sharing Store (`src/features/sharing/hooks/useSharing.ts`)

```typescript
import { useSharingStore } from '@/features/sharing/hooks/useSharing';

const {
  shareLinks,         // Array of ShareLink
  currentShare,       // Currently accessed share
  loading,
  error,
  
  // Actions
  createShareLink,    // (request) => Promise<CreateShareLinkResponse>
  deleteShareLink,    // (token) => Promise<void>
  accessShareLink,    // (request) => Promise<AccessShareLinkResponse>
  fetchUserShareLinks,// () => Promise<void>
} = useSharingStore();
```

### Creating a Share Link

```typescript
const { createShareLink } = useSharingStore();

const result = await createShareLink({
  fileId: 'file123',
  password: 'optional-password',
  expiresIn: 24, // hours
  maxAccess: 10  // max number of accesses
});

console.log(result.url); // Share URL to give to others
```

### Accessing a Share Link

```typescript
const { accessShareLink } = useSharingStore();

const result = await accessShareLink({
  token: 'share-token-from-url',
  password: 'optional-password-if-protected'
});

console.log(result.file); // File metadata
console.log(result.downloadUrl); // Download URL
```

## Usage Examples

### Example 1: File Browser Component

```typescript
import { useFilesByPath } from '@/features/files/hooks/useFilesByPath';

function FileBrowser() {
  const [path, setPath] = useState('/');
  const { data: files, isLoading } = useFilesByPath(path);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {files?.map(file => (
        <FileCard 
          key={file._id} 
          file={file}
          onClick={() => file.type === 'folder' && setPath(file.path)}
        />
      ))}
    </div>
  );
}
```

### Example 2: Upload Component

```typescript
import { useUpload } from '@/features/upload/hooks/useUpload';

function UploadButton() {
  const { uploadFiles, uploading, progress } = useUpload();

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await uploadFiles(files, '/uploads/');
  };

  return (
    <div>
      <input type="file" multiple onChange={handleFileSelect} />
      {uploading && <progress value={progress} max={100} />}
    </div>
  );
}
```

### Example 3: Delete File

```typescript
import { useDeleteFile } from '@/features/files/hooks/useFilesByPath';
import { useToast } from '@/hooks/use-toast';

function DeleteButton({ fileId }: { fileId: string }) {
  const deleteMutation = useDeleteFile();
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(fileId);
      toast({ title: 'File deleted successfully' });
    } catch (error) {
      toast({ 
        title: 'Delete failed', 
        variant: 'destructive' 
      });
    }
  };

  return (
    <button 
      onClick={handleDelete}
      disabled={deleteMutation.isPending}
    >
      {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
    </button>
  );
}
```

### Example 4: Create Share Link

```typescript
import { useSharingStore } from '@/features/sharing/hooks/useSharing';

function ShareButton({ fileId }: { fileId: string }) {
  const { createShareLink } = useSharingStore();
  const [shareUrl, setShareUrl] = useState('');

  const handleShare = async () => {
    const result = await createShareLink({
      fileId,
      expiresIn: 24, // 24 hours
    });
    setShareUrl(result.url);
  };

  return (
    <div>
      <button onClick={handleShare}>Create Share Link</button>
      {shareUrl && <input value={shareUrl} readOnly />}
    </div>
  );
}
```

## Backend API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Files
- `POST /api/files/upload` - Upload files
- `GET /api/files/list?path=/` - List files by path
- `GET /api/files/download/:id` - Download file
- `DELETE /api/files/:id` - Delete file
- `POST /api/files/folder` - Create folder
- `POST /api/files/share` - Share file with users
- `POST /api/files/unshare` - Unshare file
- `GET /api/files/shared-with-me` - Get files shared with me

### Share Links
- `POST /api/share/create` - Create share link
- `DELETE /api/share/delete/:token` - Delete share link
- `POST /api/share/access/:token` - Access shared file

## Error Handling

### Global Error Handling

All API errors are handled gracefully:

1. **401 Unauthorized**: Auto-logout and redirect to login
2. **Other errors**: Returned in response and can be handled by component

### Component-Level Error Handling

```typescript
try {
  await uploadFiles(files);
  toast({ title: 'Success!' });
} catch (error) {
  toast({ 
    title: 'Error', 
    description: error.message,
    variant: 'destructive' 
  });
}
```

## Toast Notifications

```typescript
import { useToast } from '@/hooks/use-toast';

const { toast } = useToast();

// Success
toast({ title: 'Success!', description: 'Operation completed' });

// Error
toast({ 
  title: 'Error', 
  description: 'Something went wrong',
  variant: 'destructive' 
});
```

## Development Workflow

1. **Start Backend**: `cd backend && npm run dev` (runs on port 4000)
2. **Start Frontend**: `cd frontend && npm run dev` (runs on port 5173)
3. **Login**: Navigate to `http://localhost:5173/login`
4. **Test Features**: Upload files, create folders, share links, etc.

## TypeScript Types

All types are defined in their respective feature folders:

- Auth types: In component/hook files
- File types: `src/features/files/types.ts`
- Share types: `src/features/sharing/types.ts`

## Best Practices

1. **Use React Query hooks** for data fetching and mutations
2. **Use Zustand stores** for complex state logic
3. **Use `useUpload` hook** for file uploads with progress
4. **Handle errors** with try-catch and toast notifications
5. **Check loading states** before rendering
6. **Invalidate queries** after mutations for fresh data

## Troubleshooting

### Session Issues
- Check that backend is running on port 4000
- Verify CORS settings allow credentials
- Check browser cookies (should have connect.sid)

### Upload Issues
- Check file size limits in backend
- Verify Content-Type is multipart/form-data
- Use progress callbacks for UX

### 401 Errors
- Normal after session expires
- User will be auto-redirected to login
- Re-login to get new session

## Summary

This integration provides:
- ✅ Session-based authentication (no JWT storage needed)
- ✅ Automatic session management
- ✅ Global error handling
- ✅ Type-safe API calls
- ✅ React Query for caching and mutations
- ✅ Zustand for global state
- ✅ Protected routes
- ✅ Toast notifications
- ✅ Upload progress tracking
- ✅ File sharing capabilities

Everything is ready to use! Just follow the examples above to build your features.

