import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowUpDown, FolderPlus, Home, LayoutGrid, List, Search, Trash2, Upload, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog, PromptDialog } from "@/components/common/PromptDialog";
import { useToast } from "@/hooks/use-toast";
import { errorMessage } from "@/libs/api";
import { cn } from "@/libs/utils";
import ShareDialog from "@/features/sharing/components/ShareDialog";
import UploadDialog from "@/features/upload/components/UploadDialog";
import { useCreateFolder, useDeleteItems, useDownloadFile, useFolder, useUpdateItem } from "../hooks";
import { folderPathOf, type FileItem } from "../types";
import { FileGrid, FileList } from "./FileViews";
import MoveDialog from "./MoveDialog";

type SortKey = "name" | "date" | "size";
type ViewMode = "grid" | "list";

const VIEW_KEY = "secushare:view";

function sortItems(items: FileItem[], key: SortKey) {
  return [...items].sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1; // folders first
    if (key === "date") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (key === "size") return (b.size ?? 0) - (a.size ?? 0);
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
  });
}

function Breadcrumbs({ path, onNavigate }: { path: string; onNavigate: (p: string) => void }) {
  const parts = path.split("/").filter(Boolean);
  return (
    <nav aria-label="Folder path" className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
      <button type="button" onClick={() => onNavigate("/")} className="flex items-center gap-1 rounded px-2 py-1 hover:bg-neutral-100">
        <Home className="h-4 w-4" /> My Files
      </button>
      {parts.map((name, i) => {
        const target = `/${parts.slice(0, i + 1).join("/")}/`;
        const last = i === parts.length - 1;
        return (
          <span key={target} className="flex min-w-0 items-center gap-1">
            <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
            <button
              type="button"
              onClick={() => onNavigate(target)}
              className={cn("truncate rounded px-2 py-1 hover:bg-neutral-100", last && "font-medium")}
              aria-current={last ? "page" : undefined}
            >
              {name}
            </button>
          </span>
        );
      })}
    </nav>
  );
}

export default function FileBrowser() {
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const path = params.get("path") || "/";

  const [view, setView] = useState<ViewMode>(() => (localStorage.getItem(VIEW_KEY) as ViewMode) || "grid");
  const [sort, setSort] = useState<SortKey>("name");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [uploadOpen, setUploadOpen] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [renaming, setRenaming] = useState<FileItem | null>(null);
  const [moving, setMoving] = useState<FileItem | null>(null);
  const [sharing, setSharing] = useState<FileItem | null>(null);
  const [deleting, setDeleting] = useState<FileItem[] | null>(null);

  const folder = useFolder(path);
  const createFolder = useCreateFolder();
  const updateItem = useUpdateItem();
  const deleteItems = useDeleteItems();
  const download = useDownloadFile();

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortItems((folder.data ?? []).filter((i) => !q || i.name.toLowerCase().includes(q)), sort);
  }, [folder.data, query, sort]);

  const navigate = (next: string) => {
    setSelected(new Set());
    setQuery("");
    setParams(next === "/" ? {} : { path: next });
  };

  const changeView = (v: ViewMode) => {
    setView(v);
    localStorage.setItem(VIEW_KEY, v);
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () => setSelected((prev) => (prev.size === items.length ? new Set() : new Set(items.map((i) => i._id))));

  const fail = (title: string) => (e: unknown) => toast({ title, description: errorMessage(e), variant: "destructive" });

  const open = async (item: FileItem) => {
    if (item.type === "folder") return navigate(folderPathOf(item));
    toast({ title: `Decrypting "${item.name}"…` });
    try {
      await download(item);
    } catch (e) {
      fail("Download failed")(e);
    }
  };

  const confirmDelete = () => {
    if (!deleting) return;
    deleteItems.mutate(
      deleting.map((i) => i._id),
      {
        onSuccess: ({ deleted }) => {
          toast({ title: `Deleted ${deleted} item${deleted === 1 ? "" : "s"}` });
          setSelected(new Set());
          setDeleting(null);
        },
        onError: fail("Couldn't delete"),
      }
    );
  };

  const deleteDescription = (list: FileItem[]) => {
    const folders = list.filter((i) => i.type === "folder").length;
    const what = list.length === 1 ? `"${list[0].name}"` : `${list.length} items`;
    return `${what} will be permanently deleted${folders ? ", including everything inside folders" : ""}. Share links stop working. This can't be undone.`;
  };

  const selectedItems = items.filter((i) => selected.has(i._id));
  const ItemsView = view === "grid" ? FileGrid : FileList;

  return (
    <div className="space-y-4">
      <Breadcrumbs path={path} onNavigate={navigate} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input placeholder="Search this folder" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" aria-label="Search this folder" />
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {selected.size > 0 && (
            <Button variant="outline" onClick={() => setDeleting(selectedItems)} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" /> Delete {selected.size}
            </Button>
          )}
          <label className="flex items-center gap-1 text-sm text-neutral-600">
            <ArrowUpDown className="h-4 w-4" />
            <span className="sr-only">Sort by</span>
            <select className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="name">Name</option>
              <option value="date">Newest</option>
              <option value="size">Largest</option>
            </select>
          </label>
          <div className="flex rounded-md border border-neutral-300" role="group" aria-label="View">
            <Button variant="ghost" size="sm" className={cn("h-8 rounded-r-none", view === "grid" && "bg-neutral-100")} onClick={() => changeView("grid")} aria-pressed={view === "grid"} aria-label="Grid view">
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className={cn("h-8 rounded-l-none", view === "list" && "bg-neutral-100")} onClick={() => changeView("list")} aria-pressed={view === "list"} aria-label="List view">
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" onClick={() => setNewFolderOpen(true)}>
            <FolderPlus className="mr-2 h-4 w-4" /> New folder
          </Button>
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Upload
          </Button>
        </div>
      </div>

      {folder.isLoading ? (
        <p className="py-16 text-center text-sm text-neutral-500">Loading…</p>
      ) : folder.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
          {errorMessage(folder.error, "Couldn't load this folder")}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <p className="font-medium">{query ? "No matches" : "This folder is empty"}</p>
          {!query && <p className="mt-1 text-sm text-neutral-500">Upload files or create a folder to get started.</p>}
        </div>
      ) : (
        <ItemsView
          items={items}
          selected={selected}
          onToggle={toggle}
          onToggleAll={toggleAll}
          onOpen={open}
          onShare={setSharing}
          onRename={setRenaming}
          onMove={setMoving}
          onDelete={(item) => setDeleting([item])}
        />
      )}

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} path={path} />
      <ShareDialog file={sharing} onOpenChange={(o) => !o && setSharing(null)} />
      <MoveDialog item={moving} onOpenChange={(o) => !o && setMoving(null)} />

      <PromptDialog
        open={newFolderOpen}
        title="New folder"
        label="Folder name"
        confirmLabel="Create"
        busy={createFolder.isPending}
        onOpenChange={setNewFolderOpen}
        onConfirm={(name) =>
          createFolder.mutate({ name, path }, { onSuccess: () => setNewFolderOpen(false), onError: fail("Couldn't create folder") })
        }
      />
      <PromptDialog
        open={!!renaming}
        title={`Rename ${renaming?.type ?? ""}`}
        label="Name"
        initialValue={renaming?.name}
        confirmLabel="Rename"
        busy={updateItem.isPending}
        onOpenChange={(o) => !o && setRenaming(null)}
        onConfirm={(name) =>
          renaming &&
          updateItem.mutate({ id: renaming._id, name }, { onSuccess: () => setRenaming(null), onError: fail("Couldn't rename") })
        }
      />
      <ConfirmDialog
        open={!!deleting}
        title="Delete permanently?"
        description={deleting ? deleteDescription(deleting) : undefined}
        confirmLabel="Delete"
        destructive
        busy={deleteItems.isPending}
        onOpenChange={(o) => !o && setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
