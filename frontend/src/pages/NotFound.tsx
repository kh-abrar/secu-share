import { Link } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";

export default function NotFound() {
  return (
    <AuthLayout title="Page not found">
      <p className="mb-4 text-sm text-neutral-600">The page you're looking for doesn't exist.</p>
      <Link to="/" className="text-sm text-accent underline">Go home</Link>
    </AuthLayout>
  );
}
