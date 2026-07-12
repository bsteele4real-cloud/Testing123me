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

const MODEL_OPTIONS = [
  "gpt-4-turbo",
  "gpt-4o",
  "gpt-3.5-turbo",
  "claude-3-opus",
  "claude-3-sonnet",
  "gemini-1.5-pro",
  "hermes-2-pro"
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
  const { data: agents = [] } = useListAgents({ query: { queryKey: getListAgentsQueryKey() } });
  
  const [isNewAgentOpen, setIsNewAgentOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newModel, setNewModel] = useState(MODEL_OPTIONS[0]);
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState(COLOR_OPTIONS[0]);

  const createAgent = useCreateAgent({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAgentsQueryKey() });
        setIsNewAgentOpen(false);
        setNewName("");
        setNewDesc("");
        setNewModel(MODEL_OPTIONS[0]);
        setNewColor(COLOR_OPTIONS[0]);
      }
    }
  });

  const updateAgent = useUpdateAgent({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAgentsQueryKey() })
    }
  });

  const deleteAgent = useDeleteAgent({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAgentsQueryKey() })
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
    <div className="flex flex-col h-full bg-background p-6">
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
                    <div 
                      key={c}
                      onClick={() => setNewColor(c)}
                      className={cn(
                        "w-6 h-6 rounded-sm cursor-pointer transition-all",
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {agents.map((agent) => (
          <div key={agent.id} className="bg-card border border-border/50 rounded-lg p-5 hover:border-primary/30 transition-colors group relative flex flex-col h-full">
            <div className="absolute top-4 right-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 font-mono text-xs">
                  <div className="px-2 py-1.5 text-muted-foreground opacity-50 uppercase text-[10px]">Set Status</div>
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
                    onClick={() => deleteAgent.mutate({ id: agent.id })}
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
                <p className="text-sm text-muted-foreground italic opacity-50">No purpose defined.</p>
              )}
            </div>

            <div className="pt-4 border-t border-border/50 mt-auto">
              <div className="flex items-center justify-between">
                <div className="bg-muted px-2 py-1 rounded-[2px] border border-border/50 text-[10px] font-mono">
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
    </div>
  );
}
