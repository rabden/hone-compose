"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Check, AlertCircle } from "lucide-react";
import { HugeiconsIcon } from "@/components/ui/hugeicons";
import {
  LayoutAlignRightIcon,
  LayoutAlignLeftIcon,
  DashboardCircleIcon,
  ConnectIcon,
  CommandIcon,
  Settings05Icon,
  HistoryIcon,
  AiGenerativeIcon,
} from "@hugeicons/core-free-icons";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Ripple } from "@/components/ui/ripple";
import { Button } from "@/components/ui/material-design-3-button";
import { HoneLogo } from "@/components/hone-logo";
import {
  useOptionsState,
  TEMPLATE_VERSION,
  TAB_PATHS,
  PATH_TO_TAB,
  type TabId,
} from "./options-context";

function SidebarWhitespaceTrigger() {
  const { state, setOpen } = useSidebar();
  const isCollapsed = state === "collapsed";

  if (!isCollapsed) {
    return <div className="flex-1 min-h-0" />;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex-1 w-full bg-transparent border-none cursor-e-resize outline-none"
          aria-label="Expand Sidebar"
        />
      </TooltipTrigger>
      <TooltipContent side="right" align="center">
        Expand
      </TooltipContent>
    </Tooltip>
  );
}

function SidebarToggleInHeader() {
  const { toggleSidebar, state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      shape="square"
      onClick={toggleSidebar}
      title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      className="text-muted-foreground"
    >
      <HugeiconsIcon
        icon={isCollapsed ? LayoutAlignRightIcon : LayoutAlignLeftIcon}
        className={cn(
          "size-4 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
          isCollapsed && "rotate-180",
        )}
      />
    </Button>
  );
}

export const NAV_ITEMS = [
  { value: "dashboard" as const, label: "Dashboard", icon: DashboardCircleIcon },
  { value: "api" as const, label: "API Providers", icon: ConnectIcon },
  { value: "shortcut" as const, label: "Key Bindings", icon: CommandIcon },
  { value: "customizations" as const, label: "Customizations", icon: Settings05Icon },
  { value: "history" as const, label: "Rewrite History", icon: HistoryIcon },
  { value: "actions" as const, label: "Actions Studio", icon: AiGenerativeIcon },
];

export default function OptionsShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const activeTab: TabId = PATH_TO_TAB[pathname ?? "/"] ?? "dashboard";
  const {
    saveStatus,
    lastDeletedItem,
    contentRef,
    handleUndoDelete,
  } = useOptionsState();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Expose the scroll container to tabs via context and scroll to top on navigation.
  useEffect(() => {
    contentRef.current = scrollRef.current;
  }, []);
  useEffect(() => {
    contentRef.current?.scrollTo(0, 0);
  }, [pathname, contentRef]);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex flex-col w-full h-[100dvh] overflow-hidden bg-background">
        {/* Full-width Header */}
        <header className="flex items-center h-12 px-4 bg-background shrink-0 relative select-none">
          <div className="absolute left-2">
            <SidebarToggleInHeader />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <HoneLogo size={20} alt="" />
              <span className="font-semibold text-sm tracking-wide text-foreground">
                Hone compose
              </span>
            </div>
          </div>
          <div className="w-8" />
        </header>

        {/* Body: Sidebar + Content */}
        <div className="flex flex-1 min-h-0 min-w-0">
          {/* Sidebar */}
          <Sidebar
            collapsible="icon"
            variant="sidebar"
            className="hidden md:flex bg-background !top-12 !h-[calc(100dvh-3rem)] !border-r-0"
          >
            <TooltipProvider>
              <SidebarContent>
                <SidebarGroup className="p-2">
                  <SidebarGroupContent>
                    <SidebarMenu className="gap-0.5">
                      {NAV_ITEMS.map((item, index) => {
                        const Icon = item.icon;
                        return (
                          <SidebarMenuItem key={item.value}>
                            <div
                              className={cn(
                                "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[150%] w-0.5 bg-foreground rounded-full transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
                                activeTab === item.value
                                  ? "h-5 opacity-100 scale-y-100"
                                  : "h-5 opacity-0 scale-y-0",
                              )}
                            />
                            <SidebarMenuButton
                              asChild
                              isActive={activeTab === item.value}
                              tooltip={item.label}
                              className="relative data-[active=true]:bg-muted/60 data-[active=true]:text-foreground data-[active=true]:font-semibold hover:bg-muted/30 active:scale-[0.98] transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] rounded-lg animate-in fade-in slide-in-from-top-1 duration-300 fill-mode-backwards select-none"
                              style={{ animationDelay: `${index * 40}ms` }}
                            >
                              <Link href={TAB_PATHS[item.value]}>
                                <Ripple />
                                <HugeiconsIcon
                                  icon={Icon}
                                  className={cn(
                                    "size-4 shrink-0 transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] relative z-10 pointer-events-none",
                                    activeTab === item.value
                                      ? "text-foreground"
                                      : "text-muted-foreground/50",
                                  )}
                                />
                                <span className="text-sm whitespace-nowrap relative z-10 pointer-events-none">
                                  {item.label}
                                </span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
                <SidebarWhitespaceTrigger />
              </SidebarContent>
              <SidebarFooter className="pb-2 pl-3">
                <div className="text-[10px] text-muted-foreground/60 select-none whitespace-nowrap flex items-center gap-1.5">
                  <span className="group-data-[collapsible=icon]:hidden">
                    Hone compose
                  </span>
                  <span className="opacity-50 group-data-[collapsible=icon]:hidden">
                    /
                  </span>
                  <span>v{TEMPLATE_VERSION}</span>
                </div>
              </SidebarFooter>
            </TooltipProvider>
          </Sidebar>

          {/* Main content area */}
          <main className="flex-1 min-h-0 min-w-0 flex flex-col">
            <div className="flex-1 mb-2 mr-2 rounded-lg bg-card flex flex-col min-h-0 min-w-0 relative">
              <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-6 overflow-x-hidden min-w-0">
                {children}
              </div>
              {saveStatus && (
                <div
                  className={`fixed bottom-6 right-6 flex items-center gap-2.5 px-4.5 py-3 rounded-lg text-xs shadow-lg border transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 z-50 bg-card
            ${
              saveStatus.type === "success"
                ? "border-border text-foreground"
                : "border-red-500/20 text-red-400"
            }`}
                >
                  {saveStatus.type === "success" ? (
                    <Check className="w-4 h-4 text-foreground" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="font-medium">{saveStatus.message}</span>
                  {saveStatus.type === "success" && lastDeletedItem && (
                    <button
                      onClick={handleUndoDelete}
                      className="ml-1 text-[10px] font-semibold text-foreground/50 hover:text-foreground underline underline-offset-2 transition-colors whitespace-nowrap"
                    >
                      Undo
                    </button>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
