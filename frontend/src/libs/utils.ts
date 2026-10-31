import { type ClassValue } from "clsx";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 1536 -> "1.5 KB" */
export function formatFileSize(bytes?: number | null): string {
  if (bytes === undefined || bytes === null) return "-";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

/** "Oct 14, 2025" */
export function formatDate(date?: string | Date | null): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Triggers a browser download for an in-memory (decrypted) blob. */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser time to start the download before releasing the memory
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

type IconName = "File" | "FileText" | "Image" | "Video" | "Music" | "Archive" | "Code" | "Table" | "Presentation";

const ICON_RULES: { icon: IconName; color: string; mime?: (m: string) => boolean; ext: string[] }[] = [
  { icon: "FileText", color: "text-red-500", mime: (m) => m.includes("pdf"), ext: ["pdf"] },
  { icon: "Image", color: "text-green-500", mime: (m) => m.startsWith("image/"), ext: ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "heic"] },
  { icon: "Video", color: "text-purple-500", mime: (m) => m.startsWith("video/"), ext: ["mp4", "mov", "avi", "mkv", "webm"] },
  { icon: "Music", color: "text-orange-500", mime: (m) => m.startsWith("audio/"), ext: ["mp3", "wav", "flac", "aac", "ogg"] },
  { icon: "Archive", color: "text-yellow-600", mime: (m) => /zip|rar|7z|tar|gzip/.test(m), ext: ["zip", "rar", "7z", "tar", "gz"] },
  { icon: "Table", color: "text-emerald-500", mime: (m) => m.includes("spreadsheet") || m.includes("csv"), ext: ["xls", "xlsx", "csv", "ods"] },
  { icon: "Presentation", color: "text-amber-500", mime: (m) => m.includes("presentation"), ext: ["ppt", "pptx", "odp", "key"] },
  { icon: "Code", color: "text-indigo-500", ext: ["js", "ts", "jsx", "tsx", "html", "css", "json", "xml", "py", "java", "c", "cpp", "go", "rs", "php", "sh"] },
  { icon: "FileText", color: "text-blue-500", mime: (m) => m.includes("document") || m.startsWith("text/"), ext: ["doc", "docx", "txt", "rtf", "md", "odt"] },
];

function matchIcon(mimetype?: string | null, filename?: string) {
  const mime = mimetype?.toLowerCase() ?? "";
  const ext = filename?.split(".").pop()?.toLowerCase() ?? "";
  return ICON_RULES.find((r) => (mime && r.mime?.(mime)) || r.ext.includes(ext));
}

export const getFileIcon = (mimetype?: string | null, filename?: string): IconName => matchIcon(mimetype, filename)?.icon ?? "File";
export const getFileIconColor = (mimetype?: string | null, filename?: string) => matchIcon(mimetype, filename)?.color ?? "text-neutral-500";
