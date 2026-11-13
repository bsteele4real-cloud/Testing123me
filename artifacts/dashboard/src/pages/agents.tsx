import { useState } from "react";
import { 
  useListAgents, getListAgentsQueryKey, 
  useCreateAgent, 
  useUpdateAgent, 
  useDeleteAgent 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, MoreVertical, Terminal, MessageSquare, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { QueryState } from "@/components/query-state";
import { readList } from "@/lib/query";
import { toastError } from "@/lib/notify";
import type { Agent } from "@workspace/api-client-react";

const MODEL_OPTIONS = [
  "gpt-6-luna",
  "gpt-6.1-sol",
  "claude-sonnet-5-5",
  "claude-opus-5-5",
  "gemini-4-hydrogen",
  "Hermes-4-70B",
];

const COLOR_OPTIONS = [
  "#e05252", // coral
  "#4ade80", // green
  "#60a5fa", // blue
  "#c084fc", // lighter blue
  "#f472b6", // purple
  "#fbbf24", // pink
  "#fb923c", // orange
  "#facc15"  // yellow
];

export default function AgentsPage() {
  const queryClient = useQueryClient();
  const agentsQuery = useListAgents({ query: { queryKey: getListAgentsQueryKey() } });
  const { items: agents, failed: agentsFailed } = readList<Agent>(agentsQuery.data, agentsQuery.isError);
  
  const [isNewAgentOpen, setIsNewAgentOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newModel, setNewModel] = useState(MODEL_OPTIONS[0]);
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState(COLOR_OPTIONS[0]);
  const [pendingDelete, setPendingDelete] = useState<{ id: number; name: string } | null>(null);

  const createAgent = useCreateAgent({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAgentsQueryKey() });
        setIsNewAgentOpen(false);
        setNewName("");
        setNewDesc("");
        setNewModel(MODEL_OPTIONS[0]);
        setNewColor(COLOR_OPTIONS[0]);
      },
      onError: (error) => toastError("Could not deploy agent", error),
    }
  });

  const updateAgent = useUpdateAgent({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAgentsQueryKey() }),
      onError: (error) => toastError("Could not update agent", error),
    }
  });

  const deleteAgent = useDeleteAgent({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAgentsQueryKey() });
        setPendingDelete(null);
      },
      onError: (error) => toastError("Could not decommission agent", error),
    }
  });

  const handleCreateAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    createAgent.mutate({
      data: {
        name: newName,
        model: newModel,
        description: newDesc || undefined,
        avatarColor: newColor
      }
    });
  };

  return (
    <div className="flex flex-col h-full min-w-0 bg-background p-4 md:p-6 overflow-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agent Roster</h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">Deploy and manage your AI workforce</p>
        </div>
        <Dialog open={isNewAgentOpen} onOpenChange={setIsNewAgentOpen}>
          <DialogTrigger asChild>
            <Button className="font-mono text-xs">
              <Plus className="w-4 h-4 mr-2" /> DEPLOY AGENT
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] border-border bg-card">
            <DialogHeader>
              <DialogTitle className="font-mono text-sm">DEPLOY NEW AGENT</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateAgent} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-mono text-xs">DESIGNATION</Label>
                <Input 
                  id="name" 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)} 
                  placeholder="e.g. ScraperBot_01"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc" className="font-mono text-xs">PURPOSE (OPTIONAL)</Label>
                <Input 
                  id="desc" 
                  value={newDesc} 
                  onChange={e => setNewDesc(e.target.value)} 
                  placeholder="What is this agent for?"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs">CORE MODEL</Label>
                <Select value={newModel} onValueChange={setNewModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_OPTIONS.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs">IDENTIFIER COLOR</Label>
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      type="button"
                      key={c}
                      aria-label={`Identifier color ${c}`}
                      aria-pressed={newColor === c}
                      onClick={() => setNewColor(c)}
                      className={cn(
                        "w-6 h-6 rounded-sm transition-all",
                        newColor === c ? "ring-2 ring-primary ring-offset-2 ring-offset-card scale-110" : "opacity-50 hover:opacity-100"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <Button type="submit" disabled={createAgent.isPending} className="w-full mt-4">
                Initialize Agent
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <QueryState
        isLoading={agentsQuery.isLoading}
        isError={agentsFailed}
        loadingLabel="Loading agents…"
        errorLabel="Agents could not be loaded."
        onRetry={() => agentsQuery.refetch()}
      >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {agents.length === 0 && (
          <p className="text-sm text-muted-foreground font-mono">No agents deployed.</p>
        )}
        {agents.map((agent) => (
          <div key={agent.id} className="bg-card border border-border/50 rounded-lg p-5 hover:border-primary/30 transition-colors group relative flex flex-col h-full">
            <div className="absolute top-4 right-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" aria-label={`Actions for ${agent.name}`}>
                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 font-mono text-xs">
                  <div className="px-2 py-1.5 text-muted-foreground uppercase text-xs">Set Status</div>
                  <DropdownMenuItem onClick={() => updateAgent.mutate({ id: agent.id, data: { status: "online" } })}>
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2" /> Online
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateAgent.mutate({ id: agent.id, data: { status: "busy" } })}>
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mr-2" /> Busy
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateAgent.mutate({ id: agent.id, data: { status: "offline" } })}>
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-500 mr-2" /> Offline
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:bg-destructive/10 focus:text-destructive mt-1 border-t border-border/50 rounded-none pt-2"
                    onSelect={() => setPendingDelete({ id: agent.id, name: agent.name })}
                  >
                    <Trash2 className="w-3 h-3 mr-2" /> Decommission
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="flex items-center gap-4 mb-4">
              <div 
                className="w-10 h-10 rounded-sm flex items-center justify-center flex-shrink-0" 
                style={{ backgroundColor: `${agent.avatarColor}20`, border: `1px solid ${agent.avatarColor}50` }}
              >
                <Terminal className="w-5 h-5" style={{ color: agent.avatarColor }} />
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <h3 className="font-bold text-base truncate">{agent.name}</h3>
                <div className="flex items-center gap-1.5 text-xs font-mono mt-0.5">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    agent.status === "online" ? "bg-green-500" :
                    agent.status === "busy" ? "bg-yellow-500" :
                    "bg-gray-500"
                  )} />
                  <span className="text-muted-foreground uppercase">{agent.status}</span>
                </div>
              </div>
            </div>

            <div className="mb-4 flex-1">
              {agent.description ? (
                <p className="text-sm text-muted-foreground line-clamp-2">{agent.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No purpose defined.</p>
              )}
            </div>

            <div className="pt-4 border-t border-border/50 mt-auto">
              <div className="flex items-center justify-between">
                <div className="bg-muted px-2 py-1 rounded-[2px] border border-border/50 text-xs font-mono">
                  {agent.model}
                </div>
                <div className="flex gap-3 text-muted-foreground font-mono text-xs">
                  <div className="flex items-center gap-1" title="Total Sessions">
                    <MessageSquare className="w-3.5 h-3.5" /> {agent.totalSessions}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      </QueryState>
      <ConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete ? `Decommission ${pendingDelete.name}?` : "Decommission agent?"}
        description="This deletes the agent and its chat sessions. This cannot be undone."
        confirmLabel="Decommission"
        pending={deleteAgent.isPending}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        onConfirm={() => {
          if (!pendingDelete) return;
          deleteAgent.mutate({ id: pendingDelete.id });
        }}
      />
    </div>
  );
}
