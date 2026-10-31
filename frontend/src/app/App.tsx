import { Outlet } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import VerifyEmailBanner from "@/components/layout/VerifyEmailBanner";
import { ProtectedRoute } from "./providers/ProtectedRoute";

/** Layout for signed-in pages */
export default function App() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white text-neutral-900">
        <Navbar />
        <VerifyEmailBanner />
        <main className="mx-auto max-w-6xl px-4 py-8">
          <Outlet />
        </main>
      </div>
    </ProtectedRoute>
  );
}
