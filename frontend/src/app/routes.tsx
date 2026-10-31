import { Navigate, createBrowserRouter } from "react-router-dom";
import App from "./App";
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import VerifyEmailPage from "@/pages/auth/VerifyEmailPage";
import DashboardHome from "@/pages/dashboard/DashboardHome";
import MyFiles from "@/pages/dashboard/MyFiles";
import SharedWithMe from "@/pages/dashboard/SharedWithMe";
import Settings from "@/pages/dashboard/Settings";
import ShareAccessPage from "@/pages/share/ShareAccessPage";
import NotFound from "@/pages/NotFound";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/signup", element: <SignupPage /> },
  { path: "/verify-email", element: <VerifyEmailPage /> },
  { path: "/share/:token", element: <ShareAccessPage /> },
  {
    element: <App />,
    children: [
      { path: "/", element: <Navigate to="/dashboard" replace /> },
      { path: "/dashboard", element: <DashboardHome /> },
      { path: "/files", element: <MyFiles /> },
      { path: "/shared", element: <SharedWithMe /> },
      { path: "/settings", element: <Settings /> },
    ],
  },
  { path: "*", element: <NotFound /> },
]);
