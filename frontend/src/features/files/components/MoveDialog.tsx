import { useMemo, useState } from "react";
import { Folder, Home, Search } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { errorMessage } from "@/libs/api";
import { cn } from "@/libs/utils";
import { useAllFolders, useUpdateItem } from "../hooks";
import { folderPathOf, type FileItem } from "../types";

interface MoveDialogProps {
  item: FileItem | null;
  onOpenChange: (open: boolean) => void;
}

export default function MoveDialog({ item, onOpenChange }: MoveDialogProps) {
  const { toast } = useToast();
  const folders = useAllFolders(!!item);
  const update = useUpdateItem();
  const [target, setTarget] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Every folder path except the item's current parent and (for folders) itself or its subfolders
  const destinations = useMemo(() => {
    if (!item) return [];
    const own = item.type === "folder" ? folderPathOf(item) : null;
    return ["/", ...(folders.data ?? []).map(folderPathOf)]
      .filter((p) => p !== item.path && !(own && p.startsWith(own)))
      .filter((p) => !query || p.toLowerCase().includes(query.toLowerCase()));
  }, [folders.data, item, query]);

  const close = () => {
    setTarget(null);
    setQuery("");
    onOpenChange(false);
  };

  const move = () => {
    if (!item || !target) return;
    update.mutate(
      { id: item._id, path: target },
      {
        onSuccess: () => {
          toast({ title: `Moved "${item.name}"`, description: `to ${target === "/" ? "My Files" : target}` });
          close();
        },
        onError: (e) => toast({ title: "Couldn't move", description: errorMessage(e), variant: "destructive" }),
      }
    );
  };

  return (
    <Dialog open={!!item} onOpenChange={(open) => (open ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">Move "{item?.name}"</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input placeholder="Search folders" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>

        <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-1" role="listbox" aria-label="Destination folder">
          {folders.isLoading && <p className="p-3 text-sm text-neutral-500">Loading folders…</p>}
          {!folders.isLoading && destinations.length === 0 && (
            <p className="p-3 text-sm text-neutral-500">No other folders available</p>
          )}
          {destinations.map((p) => {
            const depth = p === "/" ? 0 : p.split("/").filter(Boolean).length;
            return (
              <button
                key={p}
                type="button"
                role="option"
                aria-selected={target === p}
                onClick={() => setTarget(p)}
                className={cn(
                  "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-neutral-100",
                  target === p && "bg-blue-50 text-blue-900"
                )}
                style={{ paddingLeft: query ? undefined : `${0.5 + depth * 0.75}rem` }}
              >
                {p === "/" ? <Home className="h-4 w-4 shrink-0" /> : <Folder className="h-4 w-4 shrink-0 text-yellow-500" />}
                <span className="truncate">{p === "/" ? "My Files" : query ? p : p.split("/").filter(Boolean).pop()}</span>
              </button>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={close} disabled={update.isPending}>Cancel</Button>
          <Button onClick={move} disabled={!target || update.isPending}>{update.isPending ? "Moving…" : "Move here"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
