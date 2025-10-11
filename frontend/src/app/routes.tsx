import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import DashboardHome from "@/pages/dashboard/DashboardHome";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/signup", element: <SignupPage /> },
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <DashboardHome /> },
      { path: "dashboard", element: <DashboardHome /> },
      { path: "dashboard/my-files", element: <div>My Files</div> },
      { path: "dashboard/shared", element: <div>Shared with Me</div> },
      { path: "dashboard/upload", element: <div>Upload</div> },
      // Legacy routes for backward compatibility
      { path: "app", element: <DashboardHome /> },
      { path: "app/my-files", element: <div>My Files</div> },
      { path: "app/shared", element: <div>Shared with Me</div> },
      { path: "app/upload", element: <div>Upload</div> },
    ],
  },
  { path: "*", element: <div className="text-neutral-600">Not found</div> },
]);
