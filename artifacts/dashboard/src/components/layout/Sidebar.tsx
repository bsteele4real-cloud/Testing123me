import { useListAgents, getListAgentsQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Server, MessageSquare, LayoutDashboard, Settings, User } from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();
  const { data: agents = [] } = useListAgents({ query: { queryKey: getListAgentsQueryKey() } });

  return (
    <div className="w-64 border-r border-sidebar-border bg-sidebar h-screen flex flex-col font-mono text-sm">
      <div className="p-4 border-b border-sidebar-border flex items-center gap-3">
        <div className="w-4 h-4 bg-primary flex items-center justify-center rounded-[2px]" />
        <span className="font-bold tracking-tight text-sidebar-foreground">AGENTIC OS</span>
      </div>

      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-6">
        <div className="px-3">
          <h3 className="mb-2 px-2 text-xs font-semibold text-sidebar-foreground/50 tracking-wider">WORKSPACE</h3>
          <div className="space-y-1">
            <Link href="/">
              <div className={cn("flex items-center gap-3 px-2 py-1.5 rounded-sm hover:bg-sidebar-accent cursor-pointer transition-colors", location === "/" && "bg-sidebar-accent text-sidebar-accent-foreground")}>
                <LayoutDashboard className="w-4 h-4" />
                <span>Mission Control</span>
              </div>
            </Link>
            <Link href="/chat">
              <div className={cn("flex items-center gap-3 px-2 py-1.5 rounded-sm hover:bg-sidebar-accent cursor-pointer transition-colors", location === "/chat" && "bg-sidebar-accent text-sidebar-accent-foreground")}>
                <MessageSquare className="w-4 h-4" />
                <span>Sessions</span>
              </div>
            </Link>
            <Link href="/kanban">
              <div className={cn("flex items-center gap-3 px-2 py-1.5 rounded-sm hover:bg-sidebar-accent cursor-pointer transition-colors", location === "/kanban" && "bg-sidebar-accent text-sidebar-accent-foreground")}>
                <LayoutDashboard className="w-4 h-4" />
                <span>Kanban</span>
              </div>
            </Link>
          </div>
        </div>

        <div className="px-3">
          <div className="flex items-center justify-between mb-2 px-2">
            <h3 className="text-xs font-semibold text-sidebar-foreground/50 tracking-wider">AGENTS</h3>
            <Link href="/agents">
              <div className="text-xs text-primary hover:underline cursor-pointer">Manage</div>
            </Link>
          </div>
          <div className="space-y-1">
            {agents.map((agent) => (
              <div key={agent.id} className="flex items-center gap-3 px-2 py-1.5 rounded-sm hover:bg-sidebar-accent cursor-pointer transition-colors">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: agent.avatarColor || "var(--primary)" }} 
                />
                <span className="truncate flex-1">{agent.name}</span>
                <div className={cn("w-1.5 h-1.5 rounded-full", agent.status === "online" ? "bg-green-500" : agent.status === "busy" ? "bg-yellow-500" : "bg-gray-500")} />
              </div>
            ))}
          </div>
        </div>

        <div className="px-3">
          <h3 className="mb-2 px-2 text-xs font-semibold text-sidebar-foreground/50 tracking-wider">SELF</h3>
          <div className="space-y-1">
            <div className="flex items-center gap-3 px-2 py-1.5 rounded-sm hover:bg-sidebar-accent cursor-pointer transition-colors text-muted-foreground">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-sidebar-border bg-sidebar flex items-center gap-3">
        <div className="w-8 h-8 rounded-sm bg-muted flex items-center justify-center">
          <User className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold">User</span>
          <span className="text-xs text-muted-foreground tracking-wider">LOCAL · STUDIO</span>
        </div>
      </div>
    </div>
  );
}
