import { create } from "zustand";
import api, { setUnauthorizedHandler } from "@/libs/api";
import { queryClient } from "@/libs/queryClient";
import {
  createAccountKeys,
  deriveSecrets,
  rewrapPrivateKey,
  unlockAccountKeys,
  DecryptionError,
  type AccountKeyMaterial,
  type AccountKeys,
} from "@/libs/crypto";
import { clearAccountKeys, loadAccountKeys, saveAccountKeys } from "@/libs/keyStore";

export interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

type Status = "loading" | "anonymous" | "authenticated";

interface AuthState {
  status: Status;
  user: User | null;
  keys: AccountKeys | null;
  /** Shown on the login page, e.g. after the session expired */
  notice: string | null;

  init: () => Promise<void>;
  refreshUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  clearNotice: () => void;
}

interface AuthResponse {
  user: User;
  keys: AccountKeyMaterial;
}

async function resetLocalState() {
  queryClient.clear();
  await clearAccountKeys();
}

export const useAuth = create<AuthState>((set, get) => ({
  status: "loading",
  user: null,
  keys: null,
  notice: null,

  init: async () => {
    try {
      const { data } = await api.get<{ user: User | null }>("/auth/me");
      if (!data.user) {
        await clearAccountKeys();
        set({ status: "anonymous", user: null, keys: null });
        return;
      }
      const keys = await loadAccountKeys(data.user.id);
      if (!keys) {
        // Signed in, but this browser doesn't hold the decryption keys (e.g. storage
        // was cleared). The password is needed to unlock them again.
        await api.post("/auth/logout").catch(() => {});
        set({ status: "anonymous", user: null, keys: null, notice: "Sign in again to unlock your encrypted files." });
        return;
      }
      set({ status: "authenticated", user: data.user, keys });
    } catch {
      set({ status: "anonymous", user: null, keys: null });
    }
  },

  refreshUser: async () => {
    const { data } = await api.get<{ user: User | null }>("/auth/me");
    if (data.user) set({ user: data.user });
  },

  login: async (email, password) => {
    const { authHash, wrappingKey } = await deriveSecrets(email, password);
    const { data } = await api.post<AuthResponse>("/auth/login", { email, authHash });
    const keys = await unlockAccountKeys(data.keys, wrappingKey);
    await saveAccountKeys(data.user.id, keys);
    set({ status: "authenticated", user: data.user, keys, notice: null });
  },

  register: async (name, email, password) => {
    const { authHash, wrappingKey } = await deriveSecrets(email, password);
    const { material, keys } = await createAccountKeys(wrappingKey);
    const { data } = await api.post<AuthResponse>("/auth/register", { name, email, authHash, ...material });
    await saveAccountKeys(data.user.id, keys);
    set({ status: "authenticated", user: data.user, keys, notice: null });
  },

  logout: async () => {
    await api.post("/auth/logout").catch(() => {});
    await resetLocalState();
    set({ status: "anonymous", user: null, keys: null });
  },

  changePassword: async (currentPassword, newPassword) => {
    const email = get().user!.email;
    const [current, next] = await Promise.all([deriveSecrets(email, currentPassword), deriveSecrets(email, newPassword)]);
    const { data: material } = await api.get<AccountKeyMaterial>("/auth/keys");
    let rewrapped;
    try {
      rewrapped = await rewrapPrivateKey(material, current.wrappingKey, next.wrappingKey);
    } catch (err) {
      if (err instanceof DecryptionError) throw new Error("Current password is incorrect");
      throw err;
    }
    await api.post("/auth/change-password", {
      currentAuthHash: current.authHash,
      newAuthHash: next.authHash,
      ...rewrapped,
    });
  },

  deleteAccount: async (password) => {
    const { authHash } = await deriveSecrets(get().user!.email, password);
    await api.delete("/auth/account", { data: { authHash } });
    await resetLocalState();
    set({ status: "anonymous", user: null, keys: null });
  },

  clearNotice: () => set({ notice: null }),
}));

/** Account keys of the signed-in user. Only call inside authenticated routes. */
export function useAccountKeys(): AccountKeys {
  const keys = useAuth((s) => s.keys);
  if (!keys) throw new Error("Encryption keys are not unlocked");
  return keys;
}

setUnauthorizedHandler(() => {
  if (useAuth.getState().status !== "authenticated") return;
  void resetLocalState();
  useAuth.setState({ status: "anonymous", user: null, keys: null, notice: "Your session expired. Please sign in again." });
});
