import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Download, FolderInput, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { FileIcon } from "@/components/common/FileIcon";
import { useToast } from "@/hooks/use-toast";
import api, { errorMessage, errorReason } from "@/libs/api";
import { decryptFile, importFileKey, wrapFileKey } from "@/libs/crypto";
import { formatDate, formatFileSize, saveBlob } from "@/libs/utils";
import { useAuth } from "@/features/auth/store";
import { rememberReturnPath } from "@/features/auth/redirect";
import type { PublicLinkInfo } from "@/features/sharing/types";

type State =
  | { kind: "loading" }
  | { kind: "password"; error?: string }
  | { kind: "login"; message: string }
  | { kind: "ready"; info: PublicLinkInfo }
  | { kind: "error"; message: string };

export default function ShareAccessPage() {
  const { token = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { status: authStatus, keys } = useAuth();

  const [fileKey, setFileKey] = useState<CryptoKey | null>(null);
  const [state, setState] = useState<State>({ kind: "loading" });
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"download" | "save" | null>(null);
  const [progress, setProgress] = useState(0);

  // The decryption key travels in the URL fragment, which is never sent to the server
  useEffect(() => {
    const encoded = location.hash.slice(1);
    if (!encoded) {
      setState({ kind: "error", message: "This link is incomplete. Ask the sender to copy the full link again." });
      return;
    }
    importFileKey(encoded).then(setFileKey, () =>
      setState({ kind: "error", message: "This link is damaged. Ask the sender to copy the full link again." })
    );
  }, [location.hash]);

  const handleError = useCallback((err: unknown) => {
    const reason = errorReason(err);
    if (reason === "password_required") setState({ kind: "password" });
    else if (reason === "password_incorrect") setState({ kind: "password", error: "Incorrect password" });
    else if (reason === "login_required") setState({ kind: "login", message: errorMessage(err) });
    else setState({ kind: "error", message: errorMessage(err, "This link can't be opened") });
  }, []);

  const loadInfo = useCallback(
    async (pw?: string) => {
      try {
        const { data } = await api.post<PublicLinkInfo>(`/public/links/${token}`, { password: pw || undefined });
        setState({ kind: "ready", info: data });
      } catch (err) {
        handleError(err);
      }
    },
    [token, handleError]
  );

  // Wait for the session check so restricted links see the signed-in user
  useEffect(() => {
    if (fileKey && authStatus !== "loading") void loadInfo();
  }, [fileKey, authStatus, loadInfo]);

  const download = async (info: PublicLinkInfo) => {
    if (!fileKey) return;
    setBusy("download");
    setProgress(0);
    try {
      const { data } = await api.post<Blob>(
        `/public/links/${token}/download`,
        { password: password || undefined },
        { responseType: "blob", onDownloadProgress: (e) => e.total && setProgress(e.loaded / e.total) }
      );
      saveBlob(await decryptFile(data, fileKey, info.file.mimetype || "application/octet-stream"), info.file.name);
      if (info.downloadsRemaining !== null) {
        setState({ kind: "ready", info: { ...info, downloadsRemaining: info.downloadsRemaining - 1 } });
      }
    } catch (err) {
      toast({ title: "Download failed", description: errorMessage(err), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const saveToAccount = async () => {
    if (!fileKey || !keys) return;
    setBusy("save");
    try {
      const wrappedKey = await wrapFileKey(fileKey, keys.publicKey);
      await api.post(`/public/links/${token}/save`, { password: password || undefined, wrappedKey });
      toast({ title: "Saved to My Files" });
      navigate("/files");
    } catch (err) {
      toast({ title: "Couldn't save", description: errorMessage(err), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const signIn = (to: "/login" | "/signup") => {
    rememberReturnPath(location.pathname + location.hash);
    navigate(to);
  };

  return (
    <AuthLayout title="Shared file">
      {state.kind === "loading" && <p className="py-6 text-center text-sm text-neutral-500">Opening link…</p>}

      {state.kind === "error" && <p role="alert" className="rounded-md bg-red-50 p-4 text-sm text-red-700">{state.message}</p>}

      {state.kind === "login" && (
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">{state.message}. This file was shared with specific people.</p>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => signIn("/login")}>Sign in</Button>
            <Button className="flex-1" variant="outline" onClick={() => signIn("/signup")}>Create account</Button>
          </div>
        </div>
      )}

      {state.kind === "password" && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void loadInfo(password);
          }}
        >
          <p className="flex items-center gap-2 text-sm text-neutral-600">
            <Lock className="h-4 w-4" /> This file is password protected.
          </p>
          <div className="space-y-1">
            <Label htmlFor="link-password">Password</Label>
            <Input id="link-password" type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
            {state.error && <p className="text-xs text-red-600">{state.error}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={!password}>Unlock</Button>
        </form>
      )}

      {state.kind === "ready" && (
        <div className="space-y-5">
          <div className="flex items-center gap-4 rounded-lg border bg-neutral-50 p-4">
            <FileIcon mimetype={state.info.file.mimetype ?? undefined} filename={state.info.file.name} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-medium" title={state.info.file.name}>{state.info.file.name}</p>
              <p className="text-xs text-neutral-500">
                {formatFileSize(state.info.file.size)} · shared by {state.info.owner.name}
              </p>
            </div>
          </div>

          <ul className="space-y-1 text-xs text-neutral-500">
            <li className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-green-600" /> Decrypted in your browser; the server only stores encrypted data.
            </li>
            {state.info.expiresAt && <li>Link expires {formatDate(state.info.expiresAt)}</li>}
            {state.info.downloadsRemaining !== null && (
              <li>{state.info.downloadsRemaining} download{state.info.downloadsRemaining === 1 ? "" : "s"} remaining</li>
            )}
          </ul>

          <Button className="h-10 w-full" onClick={() => download(state.info)} disabled={!!busy || state.info.downloadsRemaining === 0}>
            <Download className="mr-2 h-4 w-4" />
            {busy === "download" ? `Downloading… ${Math.round(progress * 100)}%` : "Download"}
          </Button>

          {authStatus === "authenticated" ? (
            <Button variant="outline" className="w-full" onClick={saveToAccount} disabled={!!busy || state.info.downloadsRemaining === 0}>
              <FolderInput className="mr-2 h-4 w-4" /> {busy === "save" ? "Saving…" : "Save a copy to My Files"}
            </Button>
          ) : (
            <p className="text-center text-xs text-neutral-500">
              <button type="button" className="underline" onClick={() => signIn("/login")}>Sign in</button> to save a copy to your
              own encrypted storage.
            </p>
          )}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-neutral-400">
        <Link to="/" className="hover:underline">SecuShare</Link> · end-to-end encrypted file sharing
      </p>
    </AuthLayout>
  );
}
