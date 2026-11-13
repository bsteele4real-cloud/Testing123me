import { useListAgents, getListAgentsQueryKey, type Agent } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { MessageSquare, LayoutDashboard, Settings, User, Columns3 } from "lucide-react";
import { readList } from "@/lib/query";

export function Sidebar({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const [location] = useLocation();
  const agentsQuery = useListAgents({ query: { queryKey: getListAgentsQueryKey() } });
  const { items: agents, failed: agentsFailed } = readList<Agent>(agentsQuery.data, agentsQuery.isError);

  const itemClass = (active: boolean) =>
    cn(
      "flex items-center gap-3 px-2 py-1.5 rounded-sm hover:bg-sidebar-accent transition-colors",
      active && "bg-sidebar-accent text-sidebar-accent-foreground",
    );

  return (
    <div
      className={cn("w-64 border-r border-sidebar-border bg-sidebar h-screen flex flex-col font-mono text-sm", className)}
      onClick={onNavigate}
    >
      <div className="p-4 border-b border-sidebar-border flex items-center gap-3">
        <div className="w-4 h-4 bg-primary flex items-center justify-center rounded-[2px]" />
        <span className="font-bold tracking-tight text-sidebar-foreground">AGENTIC OS</span>
      </div>

      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-6">
        <div className="px-3">
          <h3 className="mb-2 px-2 text-xs font-semibold text-sidebar-foreground/50 tracking-wider">WORKSPACE</h3>
          <div className="space-y-1">
            <Link href="/" className={itemClass(location === "/")}>
              <LayoutDashboard className="w-4 h-4" />
              <span>Mission Control</span>
            </Link>
            <Link href="/chat" className={itemClass(location === "/chat")}>
              <MessageSquare className="w-4 h-4" />
              <span>Sessions</span>
            </Link>
            <Link href="/kanban" className={itemClass(location === "/kanban")}>
              <Columns3 className="w-4 h-4" />
              <span>Kanban</span>
            </Link>
          </div>
        </div>

        <div className="px-3">
          <div className="flex items-center justify-between mb-2 px-2">
            <h3 className="text-xs font-semibold text-sidebar-foreground/50 tracking-wider">AGENTS</h3>
            <Link href="/agents" className="text-xs text-primary hover:underline">Manage</Link>
          </div>
          <div className="space-y-1">
            {agentsFailed && (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">Agents unavailable</p>
            )}
            {agents.map((agent) => (
              <Link
                key={agent.id}
                href={`/chat?agent=${agent.id}`}
                className={itemClass(false)}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: agent.avatarColor || "var(--primary)" }}
                />
                <span className="truncate flex-1 text-left">{agent.name}</span>
                <span className="sr-only">{agent.status}</span>
                <div className={cn("w-1.5 h-1.5 rounded-full", agent.status === "online" ? "bg-green-500" : agent.status === "busy" ? "bg-yellow-500" : "bg-gray-500")} />
              </Link>
            ))}
          </div>
        </div>

        <div className="px-3">
          <h3 className="mb-2 px-2 text-xs font-semibold text-sidebar-foreground/50 tracking-wider">SELF</h3>
          <div className="space-y-1">
            <Link href="/settings" className={itemClass(location === "/settings")}>
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Link>
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
