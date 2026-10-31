import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileIcon } from "@/components/common/FileIcon";
import { cn } from "@/libs/utils";
import { useDecryptedContent } from "../hooks";
import type { FileItem } from "../types";

// Thumbnails require downloading and decrypting the whole image in the browser
const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;

const SIZES = { sm: "h-8 w-8", md: "h-12 w-12", lg: "h-16 w-16" };

function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setInView(true), { rootMargin: "200px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView]);
  return [ref, inView] as const;
}

interface ImageThumbnailProps {
  file: FileItem;
  size?: keyof typeof SIZES;
  className?: string;
}

export function ImageThumbnail({ file, size = "md", className }: ImageThumbnailProps) {
  const previewable =
    file.type === "file" && !!file.mimetype?.startsWith("image/") && (file.size ?? Infinity) <= MAX_THUMBNAIL_BYTES;
  const [ref, inView] = useInView<HTMLDivElement>();
  const getContent = useDecryptedContent();

  const { data: blob } = useQuery({
    queryKey: ["thumbnail", file._id, file.updatedAt],
    queryFn: () => getContent(file),
    enabled: previewable && inView,
    staleTime: Infinity,
    gcTime: 5 * 60_000,
    retry: false,
  });

  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) return;
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  const box = cn(SIZES[size], "flex shrink-0 items-center justify-center overflow-hidden rounded-md border", className);

  if (file.type === "folder") {
    return (
      <div className={cn(box, "border-yellow-200 bg-yellow-50")}>
        <FileIcon type="folder" size={size} />
      </div>
    );
  }

  return (
    <div ref={ref} className={cn(box, "bg-neutral-100")}>
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <FileIcon mimetype={file.mimetype ?? undefined} filename={file.name} size={size} />
      )}
    </div>
  );
}
