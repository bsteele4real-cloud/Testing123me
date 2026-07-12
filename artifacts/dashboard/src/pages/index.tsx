import { useGetDashboardStats, getGetDashboardStatsQueryKey, useGetRecentActivity, getGetRecentActivityQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Cpu, MessageSquare, CheckSquare, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function DashboardHome() {
  const { data: stats } = useGetDashboardStats({ query: { queryKey: getGetDashboardStatsQueryKey() } });
  const { data: activity = [] } = useGetRecentActivity({ query: { queryKey: getGetRecentActivityQueryKey() } });

  return (
    <div className="flex-1 overflow-auto p-8 bg-background">
      <h1 className="text-2xl font-sans font-bold tracking-tight mb-8">Mission Control</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground font-mono">AGENTS</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalAgents || 0}</div>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              <span className="text-green-500">{stats?.onlineAgents || 0}</span> ONLINE
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground font-mono">SESSIONS</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSessions || 0}</div>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              {stats?.totalMessages || 0} MESSAGES EXCHANGED
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground font-mono">TASKS</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTasks || 0}</div>
            <p className="text-xs text-muted-foreground font-mono mt-1 flex gap-2">
              <span className="text-primary">{stats?.tasksByStatus?.todo || 0} TODO</span>
              <span className="text-yellow-500">{stats?.tasksByStatus?.in_progress || 0} IN_PROG</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground font-mono">SYSTEM</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">NOMINAL</div>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              ALL SYSTEMS GO
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-card border-border/50 flex flex-col">
          <CardHeader>
            <CardTitle className="text-base font-mono">RECENT ACTIVITY</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-4">
              {activity.map((item) => (
                <div key={item.id} className="flex items-start gap-4">
                  <div className="mt-0.5">
                    {item.type === 'message_sent' && <MessageSquare className="w-4 h-4 text-muted-foreground" />}
                    {item.type === 'session_created' && <Activity className="w-4 h-4 text-muted-foreground" />}
                    {item.type === 'task_updated' && <CheckSquare className="w-4 h-4 text-muted-foreground" />}
                    {item.type === 'agent_status_changed' && <Cpu className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{item.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {item.agentName && (
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground flex items-center gap-1.5">
                          <span 
                            className="w-1.5 h-1.5 rounded-full" 
                            style={{ backgroundColor: item.agentAvatarColor || 'currentColor' }} 
                          />
                          {item.agentName}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {activity.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8">No recent activity</div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <div className="border border-border/50 bg-card rounded-md overflow-hidden relative min-h-[300px]">
          {/* Decorative Terminal view */}
          <div className="bg-muted px-4 py-2 border-b border-border/50 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50" />
            </div>
            <div className="text-xs font-mono text-muted-foreground ml-2">syslog - tail -f</div>
          </div>
          <div className="p-4 font-mono text-xs text-muted-foreground space-y-1 overflow-auto h-[calc(100%-40px)]">
            <div><span className="text-green-500">✔</span> [init] starting Agentic OS...</div>
            <div><span className="text-green-500">✔</span> [db] connected to local sqlite</div>
            <div><span className="text-primary">ℹ</span> [auth] local studio mode active</div>
            <div><span className="text-green-500">✔</span> [api] listening on port 3000</div>
            <div><span className="text-green-500">✔</span> [ws] websocket server ready</div>
            <div className="pt-2 text-primary animate-pulse">_</div>
          </div>
        </div>
      </div>
    </div>
  );
}
