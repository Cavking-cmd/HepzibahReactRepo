import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { apiRequest, type UserDto } from "@/lib/api";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, type LucideIcon } from "lucide-react";
import churchLogo from "@/assets/church-logo.png";

export interface NavSection {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface DashboardLayoutProps {
  title: string;
  roleLabel: string;
  sections: NavSection[];
  activeSection: string;
  onSectionChange: (id: string) => void;
  children: ReactNode;
  readOnly?: boolean;
}

export function DashboardLayout({
  title,
  roleLabel,
  sections,
  activeSection,
  onSectionChange,
  children,
  readOnly,
}: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserDto | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { ok, body } = await apiRequest<unknown>("GET", "/api/User/me");
      const raw = body as unknown as UserDto | null;
      if (!cancelled && ok && raw) setProfile(raw);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleLogout() {
    logout();
    toast.success("Logged out.");
    navigate("/login");
  }

  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="px-3 py-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="brand-gradient flex items-center justify-center w-8 h-8 rounded-full shrink-0 overflow-hidden ring-2 ring-primary/30 shadow-md">
              <img src={churchLogo} alt="RCCG Hephzibah Parish" className="w-6 h-6 rounded-full object-contain bg-white p-0.5" />
            </div>
            <span className="font-semibold text-sm truncate group-data-[collapsible=icon]:hidden text-gradient-brand">
              RCCG Hephzibah Parish
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <SidebarMenuItem key={section.id}>
                      <SidebarMenuButton
                        isActive={activeSection === section.id}
                        onClick={() => onSectionChange(section.id)}
                        tooltip={section.label}
                      >
                        <Icon />
                        <span>{section.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <header className="relative flex items-center justify-between gap-4 border-b px-4 py-3 bg-card/40 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <h1 className="font-semibold text-lg text-gradient-brand">{title}</h1>
            {readOnly && <Badge variant="secondary">Read-only</Badge>}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium leading-tight">{user?.email}</div>
              <div className="text-xs text-muted-foreground leading-tight">{roleLabel}</div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="h-8 w-8">
                  {profile?.avatarBase64 && <AvatarImage src={profile.avatarBase64} alt="Avatar" />}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-px header-accent-line" />
        </header>

        <main className="app-main-backdrop flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
