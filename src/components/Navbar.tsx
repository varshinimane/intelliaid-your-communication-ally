import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Brain, LayoutDashboard, MessageSquare, LogIn, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function Navbar() {
  const location = useLocation();
  const { user, signOut } = useAuth();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center space-x-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Brain className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">IntelliAid</span>
        </Link>

        <div className="flex items-center space-x-6">
          {user && (
            <div className="hidden md:flex items-center space-x-1">
              <Button
                variant={location.pathname === "/student" ? "secondary" : "ghost"}
                asChild
                className="rounded-full"
              >
                <Link to="/student">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Student
                </Link>
              </Button>
              <Button
                variant={location.pathname === "/dashboard" ? "secondary" : "ghost"}
                asChild
                className="rounded-full"
              >
                <Link to="/dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
            </div>
          )}

          <ThemeToggle />

          {!user ? (
            <Button variant="default" asChild className="rounded-full">
              <Link to="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Login
              </Link>
            </Button>
          ) : (
            <Button
              variant="default"
              onClick={() => signOut()}
              className="rounded-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
