import { useGetDashboardStats, getGetDashboardStatsQueryKey, useGetRecentActivity, getGetRecentActivityQueryKey, useHealthCheck, getHealthCheckQueryKey, type ActivityItem } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Cpu, MessageSquare, CheckSquare, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { readList } from "@/lib/query";
import { Button } from "@/components/ui/button";

export default function DashboardHome() {
  const statsQuery = useGetDashboardStats({ query: { queryKey: getGetDashboardStatsQueryKey() } });
  const activityQuery = useGetRecentActivity({ query: { queryKey: getGetRecentActivityQueryKey() } });
  const activityResult = readList<ActivityItem>(activityQuery.data, activityQuery.isError);
  const activity = activityResult.items;
  const activityLoading = activityQuery.isLoading;
  const activityError = activityResult.failed;
  const statsReady = typeof statsQuery.data?.totalAgents === "number";
  const statsFailed = !statsQuery.isLoading && (statsQuery.isError || !statsReady);
  const count = (value: number | undefined) =>
    statsQuery.isLoading || statsFailed ? "—" : String(value ?? 0);
  const health = useHealthCheck({
    query: {
      queryKey: getHealthCheckQueryKey(),
      refetchInterval: 30_000,
    },
  });
  const healthStatus = typeof health.data?.status === "string" ? health.data.status : null;

  const systemLabel = health.isPending
    ? "CHECKING"
    : healthStatus === "ok"
      ? "NOMINAL"
      : "UNAVAILABLE";
  const databaseUp = healthStatus === "ok";
  const logLines = [
    health.isPending
      ? "[health] checking /api/healthz"
      : healthStatus
        ? `[health] /api/healthz status ${healthStatus}`
        : "[health] /api/healthz returned an unexpected response",
    databaseUp ? "[db] postgres check passed" : "[db] postgres check did not pass",
    ...(activityError ? ["[activity] feed unavailable"] : []),
    ...(activityLoading ? ["[activity] loading recent events"] : []),
    ...activity.slice(0, 8).map((item) => `[activity] ${item.description}`),
  ];
  if (!activityLoading && !activityError && activity.length === 0) {
    logLines.push("[activity] no events recorded");
  }

  return (
    <div className="flex-1 overflow-auto p-4 md:p-8 bg-background">
      <h1 className="text-2xl font-sans font-bold tracking-tight mb-8">Mission Control</h1>
      {(statsFailed || statsQuery.isError) && (
        <div role="alert" className="mb-6 border border-destructive/40 bg-destructive/10 rounded-md p-4 text-sm flex items-center justify-between gap-3">
          <span>Dashboard totals could not be loaded.</span>
          <Button type="button" variant="outline" onClick={() => statsQuery.refetch()}>Retry</Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground font-mono">AGENTS</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{count(statsQuery.data?.totalAgents)}</div>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              <span className="text-green-500">{count(statsQuery.data?.onlineAgents)}</span> ONLINE
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground font-mono">SESSIONS</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{count(statsQuery.data?.totalSessions)}</div>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              {count(statsQuery.data?.totalMessages)} MESSAGES EXCHANGED
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground font-mono">TASKS</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{count(statsQuery.data?.totalTasks)}</div>
            <p className="text-xs text-muted-foreground font-mono mt-1 flex gap-2">
              <span className="text-primary">{count(statsQuery.data?.tasksByStatus?.todo)} TODO</span>
              <span className="text-yellow-500">{count(statsQuery.data?.tasksByStatus?.in_progress)} IN_PROG</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground font-mono">SYSTEM</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${systemLabel === "NOMINAL" ? "text-green-500" : systemLabel === "CHECKING" ? "text-muted-foreground" : "text-destructive"}`}>{systemLabel}</div>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              {databaseUp ? "DATABASE REACHABLE" : "CHECK API AND DATABASE"}
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
              {activityError && (
                <div role="alert" className="text-sm">
                  Activity could not be loaded.
                  <Button type="button" variant="outline" className="ml-3" onClick={() => activityQuery.refetch()}>Retry</Button>
                </div>
              )}
              {activityLoading && <div role="status" className="text-sm text-muted-foreground">Loading activity…</div>}
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
              {!activityLoading && !activityError && activity.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8">No recent activity</div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <div className="border border-border/50 bg-card rounded-md overflow-hidden relative min-h-[300px]">
          <div className="bg-muted px-4 py-2 border-b border-border/50 flex items-center gap-2">
            <div className="flex gap-1.5" aria-hidden="true">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50" />
            </div>
            <div className="text-xs font-mono text-muted-foreground ml-2">live status</div>
          </div>
          <div className="p-4 font-mono text-xs text-muted-foreground space-y-1 overflow-auto h-[calc(100%-40px)]">
            {logLines.map((line, index) => (
              <div key={`${index}-${line}`}>{line}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
