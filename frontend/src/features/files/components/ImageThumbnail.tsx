import { useState, useEffect } from 'react';
import { FileIcon, Folder } from 'lucide-react';

interface ImageThumbnailProps {
  file: {
    _id: string;
    name: string;
    type?: string;
    mimetype?: string;
    url?: string;
  };
  fileObject?: File; // For newly uploaded files
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ImageThumbnail({ file, fileObject, className = '', size = 'md' }: ImageThumbnailProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const iconSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  useEffect(() => {
    if (file.type === 'folder' || !file.mimetype?.startsWith('image/')) {
      setIsLoading(false);
      return;
    }

    // If file has a URL, use it directly
    if (file.url) {
      // Make sure the URL is absolute
      const fullUrl = file.url.startsWith('http') ? file.url : `http://localhost:4000${file.url}`;
      setImageUrl(fullUrl);
      setIsLoading(false);
      return;
    }

    // For newly uploaded files without URL, generate from file object
    if (fileObject && fileObject.type.startsWith('image/')) {
      const objectUrl = URL.createObjectURL(fileObject);
      setImageUrl(objectUrl);
      setIsLoading(false);
    } else {
      setHasError(true);
      setIsLoading(false);
    }
  }, [file.url, file.mimetype, fileObject]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  if (file.type === 'folder') {
    return (
      <div className={`${sizeClasses[size]} bg-yellow-50 rounded-md border border-yellow-200 flex items-center justify-center ${className}`}>
        <Folder className={`${iconSizeClasses[size]} text-yellow-600`} />
      </div>
    );
  }

  if (!file.mimetype?.startsWith('image/')) {
    return (
      <div className={`${sizeClasses[size]} bg-neutral-100 rounded-md border flex items-center justify-center ${className}`}>
        <FileIcon className={`${iconSizeClasses[size]} text-neutral-500`} />
      </div>
    );
  }

  if (hasError || !imageUrl) {
    return (
      <div className={`${sizeClasses[size]} bg-neutral-100 rounded-md border flex items-center justify-center ${className}`}>
        <FileIcon className={`${iconSizeClasses[size]} text-neutral-500`} />
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} relative overflow-hidden rounded-md border bg-neutral-100 ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-neutral-600"></div>
        </div>
      )}
      <img
        src={imageUrl}
        alt={file.name}
        className="w-full h-full object-cover"
        loading="lazy"
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
    </div>
  );
}
