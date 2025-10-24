import { 
  File, 
  FileText, 
  Image, 
  Video, 
  Music, 
  Archive, 
  Code, 
  Table, 
  Presentation,
  Folder
} from 'lucide-react';
import { getFileIcon, getFileIconColor } from '@/libs/utils';

interface FileIconProps {
  mimetype?: string;
  filename?: string;
  type?: 'file' | 'folder';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const iconMap = {
  File,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Code,
  Table,
  Presentation,
  Folder
};

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6'
};

export function FileIcon({ 
  mimetype, 
  filename, 
  type = 'file', 
  size = 'md', 
  className = '' 
}: FileIconProps) {
  if (type === 'folder') {
    return (
      <Folder 
        className={`${sizeClasses[size]} text-yellow-500 ${className}`} 
      />
    );
  }

  const iconName = getFileIcon(mimetype, filename);
  const IconComponent = iconMap[iconName as keyof typeof iconMap] || File;
  const colorClass = getFileIconColor(mimetype, filename);

  return (
    <IconComponent 
      className={`${sizeClasses[size]} ${colorClass} ${className}`} 
    />
  );
}
