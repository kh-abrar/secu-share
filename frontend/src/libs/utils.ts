import { type ClassValue } from "clsx";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format file size in bytes to human readable format
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "299.0 KB", "1.5 MB")
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '-';
  
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/**
 * Format date to a readable format
 * @param dateString - Date string or Date object
 * @returns Formatted date string (e.g., "Oct 14, 2025")
 */
export function formatDate(dateString?: string | Date): string {
  if (!dateString) return '-';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Get file icon based on MIME type or file extension
 * @param mimetype - MIME type of the file
 * @param filename - Name of the file (for extension fallback)
 * @returns Icon name for lucide-react
 */
export function getFileIcon(mimetype?: string, filename?: string): string {
  if (!mimetype && !filename) return 'File';
  
  const mime = mimetype?.toLowerCase() || '';
  const ext = filename?.split('.').pop()?.toLowerCase() || '';
  
  // Document types
  if (mime.includes('pdf') || ext === 'pdf') return 'FileText';
  if (mime.includes('document') || mime.includes('text') || ['doc', 'docx', 'txt', 'rtf'].includes(ext)) return 'FileText';
  
  // Image types
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) return 'Image';
  
  // Video types
  if (mime.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'Video';
  
  // Audio types
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'flac', 'aac'].includes(ext)) return 'Music';
  
  // Archive types
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('7z') || ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'Archive';
  
  // Code types
  if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss', 'json', 'xml', 'py', 'java', 'cpp', 'c', 'php'].includes(ext)) return 'Code';
  
  // Spreadsheet types
  if (mime.includes('spreadsheet') || ['xls', 'xlsx', 'csv'].includes(ext)) return 'Table';
  
  // Presentation types
  if (mime.includes('presentation') || ['ppt', 'pptx'].includes(ext)) return 'Presentation';
  
  return 'File';
}

/**
 * Get file icon color based on MIME type or file extension
 * @param mimetype - MIME type of the file
 * @param filename - Name of the file (for extension fallback)
 * @returns Tailwind color class
 */
export function getFileIconColor(mimetype?: string, filename?: string): string {
  if (!mimetype && !filename) return 'text-neutral-500';
  
  const mime = mimetype?.toLowerCase() || '';
  const ext = filename?.split('.').pop()?.toLowerCase() || '';
  
  // Document types
  if (mime.includes('pdf') || ext === 'pdf') return 'text-red-500';
  if (mime.includes('document') || mime.includes('text') || ['doc', 'docx', 'txt', 'rtf'].includes(ext)) return 'text-blue-500';
  
  // Image types
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) return 'text-green-500';
  
  // Video types
  if (mime.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'text-purple-500';
  
  // Audio types
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'flac', 'aac'].includes(ext)) return 'text-orange-500';
  
  // Archive types
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('7z') || ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'text-yellow-600';
  
  // Code types
  if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss', 'json', 'xml', 'py', 'java', 'cpp', 'c', 'php'].includes(ext)) return 'text-indigo-500';
  
  // Spreadsheet types
  if (mime.includes('spreadsheet') || ['xls', 'xlsx', 'csv'].includes(ext)) return 'text-emerald-500';
  
  // Presentation types
  if (mime.includes('presentation') || ['ppt', 'pptx'].includes(ext)) return 'text-amber-500';
  
  return 'text-neutral-500';
}
