import { useEffect, useState } from "react";
import { Copy, Link2, Lock, Trash2, UserPlus, Users, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { errorMessage } from "@/libs/api";
import { formatDate } from "@/libs/utils";
import { useFileKey } from "@/features/files/hooks";
import type { FileItem } from "@/features/files/types";
import {
  buildShareUrl,
  useCreateLink,
  useFileLinks,
  useFileRecipients,
  useRemoveRecipient,
  useRevokeLink,
  useShareWithUser,
} from "../hooks";
import { EXPIRY_LABELS, type LinkExpiry, type LinkScope, type ShareLink } from "../types";
import { parseEmails, generatePassword } from "../utils";

interface ShareDialogProps {
  file: FileItem | null;
  onOpenChange: (open: boolean) => void;
}

export default function ShareDialog({ file, onOpenChange }: ShareDialogProps) {
  return (
    <Dialog open={!!file} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[95%] flex-col overflow-hidden p-0 sm:max-w-lg">
        {file && <ShareDialogBody file={file} />}
      </DialogContent>
    </Dialog>
  );
}

function ShareDialogBody({ file }: { file: FileItem }) {
  const getKey = useFileKey();
  const [fileKey, setFileKey] = useState<CryptoKey | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);

  useEffect(() => {
    getKey(file).then(setFileKey, (e) => setKeyError(errorMessage(e)));
    // getKey is stable for the dialog's lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  return (
    <>
      <div className="border-b border-neutral-200 px-6 py-4">
        <DialogHeader className="space-y-1">
          <DialogTitle className="truncate pr-6">Share "{file.name}"</DialogTitle>
          <DialogDescription>Only people you share with can decrypt this file.</DialogDescription>
        </DialogHeader>
      </div>
      <div className="flex-1 space-y-8 overflow-y-auto px-6 py-5">
        {keyError && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{keyError}</p>}
        <PeopleSection fileId={file._id} fileKey={fileKey} />
        <LinksSection fileId={file._id} fileKey={fileKey} />
      </div>
    </>
  );
}

// ---------- people ----------

function PeopleSection({ fileId, fileKey }: { fileId: string; fileKey: CryptoKey | null }) {
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const recipients = useFileRecipients(fileId);
  const share = useShareWithUser(fileId);
  const remove = useRemoveRecipient(fileId);

  const submit = async () => {
    if (!fileKey) return;
    const emails = parseEmails(input);
    if (!emails.length) return;
    const failures: string[] = [];
    for (const email of emails) {
      try {
        await share.mutateAsync({ fileKey, email });
      } catch (e) {
        failures.push(errorMessage(e));
      }
    }
    if (failures.length) toast({ title: "Some people couldn't be added", description: failures.join("\n"), variant: "destructive" });
    else toast({ title: emails.length > 1 ? `Shared with ${emails.length} people` : `Shared with ${emails[0]}` });
    setInput(failures.length ? input : "");
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-neutral-900">
        <Users className="h-4 w-4" /> People
      </div>
      <p className="text-xs text-neutral-500">
        Share with registered users. The file appears under their "Shared with me".
      </p>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Input
          type="text"
          placeholder="name@example.com, another@example.com"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Email addresses"
        />
        <Button type="submit" disabled={!fileKey || share.isPending || !input.trim()}>
          <UserPlus className="mr-1 h-4 w-4" /> Add
        </Button>
      </form>

      {recipients.data && recipients.data.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {recipients.data.map((r) => (
            <li key={r.recipientId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{r.name}</p>
                <p className="truncate text-xs text-neutral-500">{r.email}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Stop sharing with ${r.email}`}
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate(r.recipientId, {
                    onError: (e) => toast({ title: "Couldn't remove access", description: errorMessage(e), variant: "destructive" }),
                  })
                }
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------- links ----------

function LinksSection({ fileId, fileKey }: { fileId: string; fileKey: CryptoKey | null }) {
  const { toast } = useToast();
  const links = useFileLinks(fileId);
  const create = useCreateLink(fileId);
  const revoke = useRevokeLink(fileId);

  const [scope, setScope] = useState<LinkScope>("public");
  const [emails, setEmails] = useState("");
  const [expiresIn, setExpiresIn] = useState<LinkExpiry>("7d");
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [maxDownloads, setMaxDownloads] = useState("");

  const copy = async (link: ShareLink) => {
    if (!fileKey) return;
    try {
      await navigator.clipboard.writeText(await buildShareUrl(link.token, fileKey));
      toast({ title: "Link copied", description: link.hasPassword ? "Send the password separately." : undefined });
    } catch {
      toast({ title: "Couldn't copy the link", variant: "destructive" });
    }
  };

  const submit = async () => {
    const allowed = parseEmails(emails);
    try {
      const link = await create.mutateAsync({
        scope,
        emails: scope === "restricted" ? allowed : [],
        password: usePassword && password ? password : undefined,
        expiresIn,
        maxDownloads: maxDownloads ? Number(maxDownloads) : null,
      });
      await copy(link);
      setPassword("");
      setUsePassword(false);
      setMaxDownloads("");
    } catch (e) {
      toast({ title: "Couldn't create link", description: errorMessage(e), variant: "destructive" });
    }
  };

  const invalid =
    (scope === "restricted" && parseEmails(emails).length === 0) ||
    (usePassword && password.length < 4) ||
    (maxDownloads !== "" && !(Number(maxDownloads) >= 1));

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-neutral-900">
        <Link2 className="h-4 w-4" /> Links
      </div>

      {links.data && links.data.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {links.data.map((link) => (
            <li key={link.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-1">
                  <Badge variant="secondary">{link.scope === "public" ? "Anyone with the link" : "Specific people"}</Badge>
                  {link.hasPassword && (
                    <Badge variant="outline">
                      <Lock className="mr-1 h-3 w-3" /> Password
                    </Badge>
                  )}
                  {link.expired && <Badge variant="destructive">Expired</Badge>}
                </div>
                <p className="text-xs text-neutral-500">
                  {link.expiresAt ? `Expires ${formatDate(link.expiresAt)}` : "No expiry"} · {link.downloadCount}
                  {link.maxDownloads ? ` / ${link.maxDownloads}` : ""} downloads
                  {link.scope === "restricted" && ` · ${link.allowedEmails.join(", ")}`}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="outline" size="sm" onClick={() => copy(link)} disabled={!fileKey} aria-label="Copy link">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Revoke link"
                  disabled={revoke.isPending}
                  onClick={() =>
                    revoke.mutate(link.id, {
                      onSuccess: () => toast({ title: "Link revoked" }),
                      onError: (e) => toast({ title: "Couldn't revoke link", description: errorMessage(e), variant: "destructive" }),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <p className="text-sm font-medium">New link</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset className="space-y-2">
            <legend className="mb-2 text-xs font-medium text-neutral-600">Who can open it</legend>
            {(["public", "restricted"] as const).map((s) => (
              <label key={s} className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="radio" name="link-scope" checked={scope === s} onChange={() => setScope(s)} />
                {s === "public" ? "Anyone with the link" : "Only specific people"}
              </label>
            ))}
          </fieldset>
          <div className="space-y-2">
            <Label htmlFor="link-expiry" className="text-xs text-neutral-600">Expires after</Label>
            <select
              id="link-expiry"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value as LinkExpiry)}
            >
              {Object.entries(EXPIRY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {scope === "restricted" && (
          <div className="space-y-1">
            <Label htmlFor="link-emails" className="text-xs text-neutral-600">Allowed emails</Label>
            <Input id="link-emails" placeholder="alice@example.com, bob@example.com" value={emails} onChange={(e) => setEmails(e.target.value)} />
            <p className="text-xs text-neutral-500">They must sign in with a verified account to open the link.</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={usePassword} onChange={(e) => setUsePassword(e.target.checked)} />
              Require a password
            </label>
            {usePassword && (
              <div className="flex gap-2">
                <Input type="text" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 4 characters" aria-label="Link password" />
                <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => setPassword(generatePassword())}>
                  Generate
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="link-max" className="text-xs text-neutral-600">Download limit (optional)</Label>
            <Input id="link-max" type="number" min={1} placeholder="Unlimited" value={maxDownloads} onChange={(e) => setMaxDownloads(e.target.value)} />
          </div>
        </div>

        <Button className="w-full" onClick={submit} disabled={!fileKey || invalid || create.isPending}>
          {create.isPending ? "Creating…" : "Create and copy link"}
        </Button>
      </div>
    </section>
  );
}
