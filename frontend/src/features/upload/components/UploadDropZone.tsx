import { useRef, useState } from "react";
import { FolderOpen, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/libs/utils";

/** A picked file together with its path relative to the dropped/picked folder. */
export interface PickedFile {
  file: File;
  /** e.g. "photos/2024/" or "" for top-level files */
  dir: string;
}

// Minimal typings for the (non-standard but universally supported) entries API
interface FsEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  file?: (cb: (f: File) => void, err: (e: unknown) => void) => void;
  createReader?: () => { readEntries: (cb: (entries: FsEntry[]) => void, err: (e: unknown) => void) => void };
}

async function readEntry(entry: FsEntry, dir: string): Promise<PickedFile[]> {
  if (entry.isFile && entry.file) {
    const file = await new Promise<File>((resolve, reject) => entry.file!(resolve, reject));
    return [{ file, dir }];
  }
  if (entry.isDirectory && entry.createReader) {
    const reader = entry.createReader();
    const children: FsEntry[] = [];
    // readEntries returns results in batches until it yields an empty array
    for (;;) {
      const batch = await new Promise<FsEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
      if (!batch.length) break;
      children.push(...batch);
    }
    const nested = await Promise.all(children.map((c) => readEntry(c, `${dir}${entry.name}/`)));
    return nested.flat();
  }
  return [];
}

const fromInput = (files: FileList): PickedFile[] =>
  Array.from(files).map((file) => {
    const rel = file.webkitRelativePath || file.name;
    return { file, dir: rel.slice(0, rel.length - file.name.length) };
  });

interface UploadDropZoneProps {
  onPick: (files: PickedFile[]) => void;
  disabled?: boolean;
}

export default function UploadDropZone({ onPick, disabled }: UploadDropZoneProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setHover(false);
    if (disabled) return;
    const entries = Array.from(e.dataTransfer.items)
      .map((item) => item.webkitGetAsEntry?.() as FsEntry | null)
      .filter((x): x is FsEntry => !!x);
    onPick(entries.length ? (await Promise.all(entries.map((en) => readEntry(en, "")))).flat() : fromInput(e.dataTransfer.files));
  };

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) onPick(fromInput(e.target.files));
    e.target.value = "";
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={onDrop}
      className={cn(
        "rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
        hover ? "border-blue-500 bg-blue-50/40" : "border-neutral-300"
      )}
    >
      <Upload className="mx-auto mb-3 text-neutral-500" />
      <p className="mb-1 font-medium">Drag and drop files or folders</p>
      <p className="mb-4 text-sm text-neutral-500">Files are encrypted on this device before upload</p>
      <div className="flex items-center justify-center gap-3">
        <Button type="button" variant="outline" onClick={() => fileInput.current?.click()} disabled={disabled}>
          Choose files
        </Button>
        <Button type="button" variant="outline" onClick={() => folderInput.current?.click()} disabled={disabled}>
          <FolderOpen className="mr-2 h-4 w-4" /> Choose folder
        </Button>
      </div>
      <input ref={fileInput} type="file" multiple hidden onChange={onInput} />
      <input ref={folderInput} type="file" multiple hidden onChange={onInput} webkitdirectory="" />
    </div>
  );
}
