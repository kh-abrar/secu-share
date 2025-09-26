// features/upload/components/UploadDropZone.tsx
import { useCallback, useRef, useState } from "react";
import { Upload, FolderOpen } from "lucide-react";

export type UploadDropzoneProps = {
  onSelect?: (files: File[]) => void;
  accept?: string[];
  maxFiles?: number;
  maxSizeMB?: number;
  className?: string;
  onUploaded?: (created: any[]) => void;
  token?: string;
};

export default function UploadDropzone({
  onSelect, accept, maxFiles, maxSizeMB, className, onUploaded, token,
}: UploadDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dirInputRef = useRef<HTMLInputElement>(null);
  const [isHover, setIsHover] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickFiles = () => fileInputRef.current?.click();
  const pickFolder = () => dirInputRef.current?.click();

  const traverseFileTree = (entry: any, pathPrefix = ""): Promise<File[]> =>
    new Promise((resolve) => {
      if (entry.isFile) {
        entry.file((file: File) => {
          (file as any).webkitRelativePath = pathPrefix + file.name;
          resolve([file]);
        });
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        const entries: any[] = [];
        const readEntries = () => {
          dirReader.readEntries(async (batch: any[]) => {
            if (!batch.length) {
              const nested = await Promise.all(
                entries.map((ent) => traverseFileTree(ent, pathPrefix + entry.name + "/"))
              );
              resolve(nested.flat());
            } else {
              entries.push(...batch);
              readEntries();
            }
          });
        };
        readEntries();
      } else resolve([]);
    });

  const validate = (incoming: File[]) => {
    let files = incoming;
    if (accept?.length) {
      const allow = new Set(accept);
      files = files.filter((f) => allow.has(f.type));
    }
    if (maxSizeMB && maxSizeMB > 0) {
      const maxBytes = maxSizeMB * 1024 * 1024;
      files = files.filter((f) => f.size <= maxBytes);
    }
    if (maxFiles && maxFiles > 0) files = files.slice(0, maxFiles);
    return files;
  };

  const uploadFiles = async (files: File[]) => {
    if (!files.length) return;
    const form = new FormData();
    for (const f of files) {
      form.append("files", f);
      const rel = (f as any).webkitRelativePath || f.name;
      form.append("relativePaths", rel);
    }
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
    if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
    const json = await res.json();
    onUploaded?.(json.created || []);
  };

  const handleFinal = async (files: File[]) => {
    const vetted = validate(files);
    if (!vetted.length) { setError("No files passed validation."); return; }
    if (onSelect) onSelect(vetted);
    else await uploadFiles(vetted);
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsHover(false);
    setError(null);
    setBusy(true);
    try {
      const dt = e.dataTransfer;
      const items = dt.items;
      let allFiles: File[] = [];

      if (items && items.length && (items[0] as any).webkitGetAsEntry) {
        const promises: Promise<File[]>[] = [];
        for (let i = 0; i < items.length; i++) {
          const entry = (items[i] as any).webkitGetAsEntry?.();
          if (entry) promises.push(traverseFileTree(entry));
        }
        allFiles = (await Promise.all(promises)).flat();
      } else {
        allFiles = Array.from(dt.files);
      }

      await handleFinal(allFiles);
    } catch (err: any) {
      setError(err?.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  }, [onSelect]);

  const onPickFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.files ? Array.from(e.target.files) : [];
    if (!raw.length) return;
    setError(null);
    setBusy(true);
    try { await handleFinal(raw); }
    catch (err: any) { setError(err?.message || "Upload failed."); }
    finally { setBusy(false); e.target.value = ""; }
  };

  return (
    <div className={`w-full ${className ?? ""}`}>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsHover(true); }}
        onDragLeave={() => setIsHover(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition
          ${isHover ? "border-blue-500 bg-blue-50/30" : "border-gray-300"}`}
      >
        <Upload className="mx-auto mb-3" />
        <p className="mb-2 font-medium">Drag & drop files or folders here</p>
        <p className="text-sm text-gray-500 mb-4">We’ll preserve your folder structure</p>

        <div className="flex items-center justify-center gap-3">
          <button onClick={pickFiles} className="px-4 py-2 rounded-xl border hover:bg-gray-50" disabled={busy} type="button">
            Browse files
          </button>
          <button onClick={pickFolder} className="px-4 py-2 rounded-xl border hover:bg-gray-50 inline-flex items-center gap-2" disabled={busy} type="button">
            <FolderOpen size={16} /> Browse folder
          </button>
        </div>

        {busy && <p className="mt-3 text-sm">Processing…</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={onPickFiles} />
      <input
          ref={dirInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={onPickFiles}
          {...({ webkitdirectory: "", directory: "", mozdirectory: "" } as any)}
       />
    </div>
  );
}
