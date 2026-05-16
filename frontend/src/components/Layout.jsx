import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Bell,
  MessageSquare,
  GraduationCap,
  BarChart3,
  Sparkles,
  AlertTriangle,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const roleLinks = {
  parent: [
    { to: "/parent", label: "Dashboard", icon: LayoutDashboard },
    { to: "/alerts", label: "Alerts", icon: AlertTriangle },
    { to: "/notifications", label: "Notifications", icon: Bell },
    { to: "/messages", label: "Messages", icon: MessageSquare },
    { to: "/ai", label: "AI Insights", icon: Sparkles },
  ],
  teacher: [
    { to: "/teacher", label: "Dashboard", icon: LayoutDashboard },
    { to: "/alerts", label: "Alerts", icon: AlertTriangle },
    { to: "/grades", label: "Grades", icon: GraduationCap },
    { to: "/notifications", label: "Notifications", icon: Bell },
    { to: "/messages", label: "Messages", icon: MessageSquare },
    { to: "/ai", label: "AI Insights", icon: Sparkles },
  ],
  admin: [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { to: "/notifications", label: "Notifications", icon: Bell },
    { to: "/messages", label: "Messages", icon: MessageSquare },
    { to: "/reports", label: "Reports", icon: BarChart3 },
    { to: "/ai", label: "AI Insights", icon: Sparkles },
  ],
  school_director: [
    { to: "/school-director", label: "Dashboard", icon: LayoutDashboard },
    { to: "/notifications", label: "Notifications", icon: Bell },
    { to: "/reports", label: "Reports", icon: BarChart3 },
  ],
};

const roleTitles = {
  parent: "Parent Dashboard",
  teacher: "Teacher Dashboard",
  admin: "Admin Dashboard",
  school_director: "School Director Dashboard",
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = roleLinks[user?.role] || [];
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  useEffect(() => {
    let timer = null;
    const loadUnread = async () => {
      try {
        const [messagesRes, alertsRes] = await Promise.all([
          api.get("/messages/unread-count"),
          user?.role && ["parent", "teacher"].includes(user.role)
            ? api.get("/alerts/unread-count")
            : Promise.resolve({ data: { data: { total: 0 } } }),
        ]);
        setUnreadCount(messagesRes.data.data?.total || 0);
        setUnreadAlertsCount(alertsRes.data.data?.total || 0);
      } catch {
        setUnreadCount(0);
        setUnreadAlertsCount(0);
      }
    };

    if (user?.role && ["parent", "teacher", "admin"].includes(user.role)) {
      loadUnread();
      timer = setInterval(loadUnread, 20000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [user?.role]);

  const initials = user?.fullName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  const navContent = (
    <nav className="flex flex-col gap-1 p-3">
      {links.map((link) => {
        const Icon = link.icon;
        const badge =
          (link.to === "/messages" && unreadCount > 0 && unreadCount) ||
          (link.to === "/alerts" && unreadAlertsCount > 0 && unreadAlertsCount) ||
          null;
        return (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{link.label}</span>
            {badge ? (
              <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1.5 text-[10px]">
                {badge}
              </Badge>
            ) : null}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="glass-strong sticky top-0 z-40 border-b">
        <div className="flex h-14 items-center justify-between gap-4 px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Link to="/" className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight">SchoolConnect AI</span>
              <span className="text-[10px] text-muted-foreground hidden sm:block">
                {roleTitles[user?.role] || "Dashboard"}
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-2 py-1">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
              </Avatar>
              <div className="text-left leading-tight">
                <p className="text-xs font-medium max-w-[120px] truncate">{user?.fullName}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{user?.role?.replace("_", " ")}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-border/60">
          <div className="glass sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">{navContent}</div>
        </aside>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button type="button" className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-label="Close menu" />
            <aside className="absolute left-0 top-14 bottom-0 w-64 glass-strong border-r overflow-y-auto">{navContent}</aside>
          </div>
        ) : null}

        <main className="flex-1 overflow-auto p-4 lg:p-6 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

