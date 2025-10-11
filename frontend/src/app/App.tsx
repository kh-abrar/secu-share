import { Outlet } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import { ProtectedRoute } from "./providers/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";

export default function App() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white text-black">
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-8">
          <Outlet />
        </main>
        <Toaster />
      </div>
    </ProtectedRoute>
  );
}
