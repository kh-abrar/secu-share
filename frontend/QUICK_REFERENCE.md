# Quick Reference Cheat Sheet

## 🔐 Authentication

```typescript
import { useAuth } from '@/app/providers/auth-provider';

// In component
const { user, isAuthenticated, login, logout, signup } = useAuth();

// Login
await login({ email: 'user@example.com', password: 'password123' });

// Signup
await signup({ email: 'user@example.com', password: 'password123', name: 'John' });

// Logout
await logout();

// Check if authenticated
if (isAuthenticated) { /* user is logged in */ }
```

## 📁 File Operations

### Fetch Files
```typescript
import { useFilesByPath } from '@/features/files/hooks/useFilesByPath';

const { data: files, isLoading, error, refetch } = useFilesByPath('/my-folder/');
```

### Upload Files
```typescript
import { useUpload } from '@/features/upload/hooks/useUpload';

const { uploadFiles, uploading, progress } = useUpload();

await uploadFiles([file1, file2], '/destination/');
// progress: 0-100
```

### Upload Folder
```typescript
const { uploadFolder } = useUpload();

// From input with webkitdirectory
const input = document.getElementById('folder-input');
await uploadFolder(input.files, '/destination/');
```

### Delete File
```typescript
import { useDeleteFile } from '@/features/files/hooks/useFilesByPath';

const deleteMutation = useDeleteFile();
await deleteMutation.mutateAsync(fileId);
```

### Download File
```typescript
import { useDownloadFile } from '@/features/files/hooks/useFilesByPath';

const downloadMutation = useDownloadFile();
await downloadMutation.mutateAsync({ 
  fileId: 'abc123', 
  filename: 'document.pdf' 
});
```

### Create Folder
```typescript
import { useCreateFolder } from '@/features/files/hooks/useFilesByPath';

const createFolderMutation = useCreateFolder();
await createFolderMutation.mutateAsync({ 
  name: 'New Folder', 
  path: '/parent-folder/' 
});
```

### Shared With Me
```typescript
import { useSharedWithMe } from '@/features/files/hooks/useFilesByPath';

const { data: sharedFiles } = useSharedWithMe();
```

## 🔗 Sharing

### Create Share Link
```typescript
import { useSharingStore } from '@/features/sharing/hooks/useSharing';

const { createShareLink } = useSharingStore();

const result = await createShareLink({
  fileId: 'file-id-here',
  password: 'optional-password',  // optional
  expiresIn: 24,                  // hours, optional
  maxAccess: 10                   // optional
});

// result.url - share this URL
// result.link.token - the token
```

### Access Share Link
```typescript
const { accessShareLink } = useSharingStore();

const result = await accessShareLink({
  token: 'share-token',
  password: 'password-if-protected'  // optional
});

// result.file - file metadata
// result.downloadUrl - download URL
```

### Delete Share Link
```typescript
const { deleteShareLink } = useSharingStore();
await deleteShareLink('share-token');
```

### Share with Specific Users
```typescript
import { useShareFile } from '@/features/files/hooks/useFilesByPath';

const shareMutation = useShareFile();
await shareMutation.mutateAsync({
  fileId: 'file-id',
  shareWith: ['user1@example.com', 'user2@example.com']
});
```

## 🎨 UI Components

### Toast Notifications
```typescript
import { useToast } from '@/hooks/use-toast';

const { toast } = useToast();

// Success
toast({ title: 'Success!', description: 'File uploaded' });

// Error
toast({ 
  title: 'Error', 
  description: 'Upload failed',
  variant: 'destructive' 
});
```

### Loading State
```typescript
{isLoading ? (
  <div>Loading...</div>
) : (
  <div>Content</div>
)}
```

### Error Display
```typescript
{error && (
  <div className="text-red-600">{error}</div>
)}
```

## 🛣️ Navigation

### Programmatic Navigation
```typescript
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
navigate('/dashboard');
```

### Link Component
```typescript
import { Link } from 'react-router-dom';

<Link to="/dashboard/my-files">My Files</Link>
```

### NavLink (with active state)
```typescript
import { NavLink } from 'react-router-dom';

<NavLink 
  to="/dashboard" 
  className={({isActive}) => isActive ? 'active' : ''}
>
  Dashboard
</NavLink>
```

## 🔄 React Query

### Invalidate Cache
```typescript
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

// Invalidate specific query
queryClient.invalidateQueries({ queryKey: ['files', '/my-folder/'] });

// Invalidate all file queries
queryClient.invalidateQueries({ queryKey: ['files'] });
```

### Mutation with Loading
```typescript
const mutation = useDeleteFile();

<button 
  onClick={() => mutation.mutate(fileId)}
  disabled={mutation.isPending}
>
  {mutation.isPending ? 'Deleting...' : 'Delete'}
</button>
```

## 🎯 Common Patterns

### Protected Component
```typescript
import { useAuth } from '@/app/providers/auth-provider';

function MyComponent() {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <div>Please login</div>;
  }
  
  return <div>Protected content</div>;
}
```

### File Upload with Progress
```typescript
function UploadComponent() {
  const { uploadFiles, uploading, progress } = useUpload();
  
  const handleUpload = async (files: File[]) => {
    await uploadFiles(files, '/uploads/');
  };
  
  return (
    <div>
      <input type="file" multiple onChange={(e) => handleUpload(Array.from(e.target.files || []))} />
      {uploading && (
        <div>
          <progress value={progress} max={100} />
          <span>{progress}%</span>
        </div>
      )}
    </div>
  );
}
```

### Folder Browser
```typescript
function FolderBrowser() {
  const [path, setPath] = useState('/');
  const { data: files } = useFilesByPath(path);
  
  return (
    <div>
      {files?.filter(f => f.type === 'folder').map(folder => (
        <button 
          key={folder._id}
          onClick={() => setPath(`${folder.path}${folder.name}/`)}
        >
          📁 {folder.name}
        </button>
      ))}
    </div>
  );
}
```

### Error Handling
```typescript
try {
  await uploadFiles(files);
  toast({ title: 'Success!' });
} catch (error: any) {
  toast({ 
    title: 'Error',
    description: error.message,
    variant: 'destructive'
  });
}
```

## 🔧 Direct API Calls

```typescript
import api from '@/libs/api';

// GET request
const response = await api.get('/files/list', { params: { path: '/' } });

// POST request
const response = await api.post('/files/folder', { name: 'New Folder', path: '/' });

// DELETE request
await api.delete(`/files/${fileId}`);

// Upload with FormData
const formData = new FormData();
formData.append('files', file);
await api.post('/files/upload', formData);
```

## 📝 TypeScript Types

```typescript
import type { FileItem } from '@/features/files/types';
import type { ShareLink, CreateShareLinkRequest } from '@/features/sharing/types';

const file: FileItem = {
  _id: 'string',
  type: 'file' | 'folder',
  name: 'string',
  path: 'string',
  owner: 'string',
  // ... more properties
};
```

## 🚀 Quick Start Template

```typescript
import { useAuth } from '@/app/providers/auth-provider';
import { useFilesByPath } from '@/features/files/hooks/useFilesByPath';
import { useUpload } from '@/features/upload/hooks/useUpload';
import { useToast } from '@/hooks/use-toast';

export default function MyPage() {
  const { user } = useAuth();
  const { data: files, isLoading } = useFilesByPath('/');
  const { uploadFiles, progress } = useUpload();
  const { toast } = useToast();
  
  const handleUpload = async (files: File[]) => {
    try {
      await uploadFiles(files, '/');
      toast({ title: 'Upload successful!' });
    } catch (error: any) {
      toast({ 
        title: 'Upload failed', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  };
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>Hello {user?.email}</h1>
      <input 
        type="file" 
        multiple 
        onChange={(e) => handleUpload(Array.from(e.target.files || []))} 
      />
      {files?.map(file => (
        <div key={file._id}>{file.name}</div>
      ))}
    </div>
  );
}
```

## 📚 Import Paths

```typescript
// API
import api from '@/libs/api';

// Auth
import { useAuth } from '@/app/providers/auth-provider';
import { useAuthStore } from '@/hooks/useAuth';

// Files
import { useFileStore } from '@/features/files/hooks/useFiles';
import { useFilesByPath, useUploadFiles } from '@/features/files/hooks/useFilesByPath';
import { useUpload } from '@/features/upload/hooks/useUpload';

// Sharing
import { useSharingStore } from '@/features/sharing/hooks/useSharing';

// UI
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

// Types
import type { FileItem } from '@/features/files/types';
import type { ShareLink } from '@/features/sharing/types';
```

---

💡 **Tip**: Check `INTEGRATION_GUIDE.md` for detailed explanations and more examples!

