"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellRing,
  Globe,
  Landmark,
  LayoutDashboard,
  Settings,
  Sparkles,
  SquareKanban,
  Users,
  Wand2,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { BrandSwitcher } from "@/components/shell/brand-switcher";
import type { BrandView } from "@/lib/brands";

const NAV_ITEMS = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Pipeline", url: "/pipeline", icon: SquareKanban },
  { title: "Contacts", url: "/contacts", icon: Users },
  { title: "Follow-ups", url: "/follow-ups", icon: BellRing },
  { title: "Finance", url: "/finance", icon: Landmark },
  { title: "Analytics", url: "/analytics", icon: Globe },
  { title: "Content", url: "/content", icon: Wand2 },
  { title: "Joseph", url: "/assistant", icon: Sparkles },
];

export function AppSidebar({ activeBrand }: { activeBrand: BrandView }) {
  const pathname = usePathname();

  const isActive = (url: string) =>
    url === "/" ? pathname === "/" : pathname.startsWith(url);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <Image
                  src="/capstone-logo.png"
                  alt="Capstone"
                  width={32}
                  height={32}
                  className="size-8 shrink-0 object-contain"
                  priority
                />
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">Capstone</span>
                  <span className="truncate text-[10px] italic text-muted-foreground">a cut above the rest</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <div className="px-1 pt-1">
              <BrandSwitcher active={activeBrand} />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="px-2">
          {NAV_ITEMS.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                <Link href={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu className="px-2">
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname.startsWith("/settings")} tooltip="Settings">
              <Link href="/settings">
                <Settings />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
