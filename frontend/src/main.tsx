import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { router } from "@/app/routes";
import { queryClient } from "@/libs/queryClient";
import { useAuth } from "@/features/auth/store";
import { Toaster } from "@/components/ui/toaster";
import "./styles/globals.css";

void useAuth.getState().init();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  </React.StrictMode>
);
