import { Download, Edit3, FolderInput, MoreVertical, Share2, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn, formatDate, formatFileSize } from "@/libs/utils";
import { ImageThumbnail } from "./ImageThumbnail";
import { isShared, type FileItem } from "../types";

export interface ItemActions {
  /** Folder: navigate into it. File: download it. */
  onOpen: (item: FileItem) => void;
  onShare: (item: FileItem) => void;
  onRename: (item: FileItem) => void;
  onMove: (item: FileItem) => void;
  onDelete: (item: FileItem) => void;
}

interface FileViewProps extends ItemActions {
  items: FileItem[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
}

function ItemMenu({ item, ...actions }: { item: FileItem } & ItemActions) {
  const isFile = item.type === "file";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label={`Actions for ${item.name}`} onClick={(e) => e.stopPropagation()}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {isFile && (
          <DropdownMenuItem onClick={() => actions.onOpen(item)}>
            <Download className="mr-2 h-4 w-4" /> Download
          </DropdownMenuItem>
        )}
        {isFile && (
          <DropdownMenuItem onClick={() => actions.onShare(item)}>
            <Share2 className="mr-2 h-4 w-4" /> Share
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => actions.onRename(item)}>
          <Edit3 className="mr-2 h-4 w-4" /> Rename
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => actions.onMove(item)}>
          <FolderInput className="mr-2 h-4 w-4" /> Move
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => actions.onDelete(item)} className="text-red-600">
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SharedBadge({ item }: { item: FileItem }) {
  if (!isShared(item)) return null;
  const parts = [
    item.recipientCount ? `${item.recipientCount} ${item.recipientCount === 1 ? "person" : "people"}` : null,
    item.linkCount ? `${item.linkCount} ${item.linkCount === 1 ? "link" : "links"}` : null,
  ].filter(Boolean);
  return (
    <Badge variant="secondary" title={parts.join(", ")}>
      <Users className="mr-1 h-3 w-3" /> Shared
    </Badge>
  );
}

const pickActions = ({ onOpen, onShare, onRename, onMove, onDelete }: ItemActions) => ({ onOpen, onShare, onRename, onMove, onDelete });

export function FileGrid({ items, selected, onToggle, ...rest }: FileViewProps) {
  const actions = pickActions(rest);
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map((item) => {
        const isSelected = selected.has(item._id);
        return (
          <div
            key={item._id}
            role="button"
            tabIndex={0}
            onClick={() => actions.onOpen(item)}
            onKeyDown={(e) => e.key === "Enter" && actions.onOpen(item)}
            className={cn(
              "group relative cursor-pointer rounded-xl border p-4 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              isSelected ? "border-blue-500 bg-blue-50" : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
            )}
          >
            <div className="absolute left-2 top-2" onClick={(e) => e.stopPropagation()}>
              <Checkbox checked={isSelected} onCheckedChange={() => onToggle(item._id)} aria-label={`Select ${item.name}`} />
            </div>
            <div className={cn("absolute right-1 top-1 transition-opacity", !isSelected && "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100")}>
              <ItemMenu item={item} {...actions} />
            </div>
            <div className="flex flex-col items-center pt-5 text-center">
              <ImageThumbnail file={item} size="lg" className="mb-3" />
              <p className={cn("w-full truncate text-sm", item.type === "folder" ? "font-semibold" : "font-medium")} title={item.name}>
                {item.name}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                {item.type === "file" ? formatFileSize(item.size) : "Folder"} · {formatDate(item.createdAt)}
              </p>
              <div className="mt-2 h-5">
                <SharedBadge item={item} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function FileList({ items, selected, onToggle, onToggleAll, ...rest }: FileViewProps) {
  const actions = pickActions(rest);
  const allSelected = items.length > 0 && items.every((i) => selected.has(i._id));
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="w-10 px-3 py-2">
              <Checkbox checked={allSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
            </th>
            <th className="px-3 py-2">Name</th>
            <th className="hidden px-3 py-2 sm:table-cell">Size</th>
            <th className="hidden px-3 py-2 md:table-cell">Added</th>
            <th className="hidden px-3 py-2 md:table-cell">Sharing</th>
            <th className="w-12 px-3 py-2"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {items.map((item) => (
            <tr key={item._id} className={cn(selected.has(item._id) ? "bg-blue-50" : "hover:bg-neutral-50")}>
              <td className="px-3 py-2">
                <Checkbox checked={selected.has(item._id)} onCheckedChange={() => onToggle(item._id)} aria-label={`Select ${item.name}`} />
              </td>
              <td className="max-w-0 px-3 py-2">
                <button type="button" className="flex w-full min-w-0 items-center gap-3 text-left" onClick={() => actions.onOpen(item)}>
                  <ImageThumbnail file={item} size="sm" />
                  <span className={cn("truncate", item.type === "folder" ? "font-semibold" : "font-medium")} title={item.name}>
                    {item.name}
                  </span>
                </button>
              </td>
              <td className="hidden whitespace-nowrap px-3 py-2 text-neutral-600 sm:table-cell">
                {item.type === "file" ? formatFileSize(item.size) : "-"}
              </td>
              <td className="hidden whitespace-nowrap px-3 py-2 text-neutral-500 md:table-cell">{formatDate(item.createdAt)}</td>
              <td className="hidden px-3 py-2 md:table-cell">
                <SharedBadge item={item} />
              </td>
              <td className="px-3 py-2 text-right">
                <ItemMenu item={item} {...actions} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
