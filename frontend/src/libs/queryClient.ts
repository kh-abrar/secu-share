import { QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Don't retry client errors (401/403/404...), only transient failures
      retry: (count, err) => count < 2 && !(isAxiosError(err) && (err.response?.status ?? 500) < 500),
    },
  },
});
