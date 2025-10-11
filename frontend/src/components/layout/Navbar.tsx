import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/providers/auth-provider";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-10 border-b bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="font-semibold tracking-tight">SecuShare</Link>

        <nav className="hidden gap-6 text-sm md:flex">
          <NavLink to="/dashboard" className={({isActive}) => isActive ? "text-black" : "text-neutral-500 hover:text-black"}>Dashboard</NavLink>
          <NavLink to="/dashboard/my-files" className={({isActive}) => isActive ? "text-black" : "text-neutral-500 hover:text-black"}>My Files</NavLink>
          <NavLink to="/dashboard/shared" className={({isActive}) => isActive ? "text-black" : "text-neutral-500 hover:text-black"}>Shared with Me</NavLink>
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden text-sm text-neutral-600 md:inline">{user.email}</span>
              <Button variant="outline" className="h-9" onClick={handleLogout}>Logout</Button>
            </>
          ) : (
            <>
              <Button variant="link" asChild className="h-9 px-2">
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild className="h-9 bg-accent text-white hover:opacity-90">
                <Link to="/signup">Signup</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
