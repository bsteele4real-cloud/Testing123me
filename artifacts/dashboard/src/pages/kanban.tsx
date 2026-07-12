import { useState } from "react";
import { 
  useListTasks, getListTasksQueryKey, 
  useCreateTask, 
  useUpdateTask, 
  useDeleteTask,
  useListAgents, getListAgentsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MoreVertical, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@workspace/api-client-react";

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "TODO" },
  { id: "in_progress", label: "IN PROGRESS" },
  { id: "review", label: "REVIEW" },
  { id: "done", label: "DONE" }
];

export default function KanbanPage() {
  const queryClient = useQueryClient();
  const { data: tasks = [] } = useListTasks({ query: { queryKey: getListTasksQueryKey() } });
  const { data: agents = [] } = useListAgents({ query: { queryKey: getListAgentsQueryKey() } });

  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>("none");

  const createTask = useCreateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        setIsNewTaskOpen(false);
        setNewTaskTitle("");
        setNewTaskDesc("");
        setNewTaskPriority("medium");
        setNewTaskAssignee("none");
      }
    }
  });

  const updateTask = useUpdateTask({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() })
    }
  });

  const deleteTask = useDeleteTask({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() })
    }
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle) return;

    createTask.mutate({
      data: {
        title: newTaskTitle,
        description: newTaskDesc || undefined,
        priority: newTaskPriority,
        assigneeAgentId: newTaskAssignee !== "none" ? Number(newTaskAssignee) : undefined,
        status: "todo"
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-background p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Task Queue</h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">Manage active agent tasks</p>
        </div>
        <Dialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
          <DialogTrigger asChild>
            <Button className="font-mono text-xs">
              <Plus className="w-4 h-4 mr-2" /> NEW TASK
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] border-border bg-card">
            <DialogHeader>
              <DialogTitle className="font-mono text-sm">CREATE TASK</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTask} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="font-mono text-xs">TITLE</Label>
                <Input 
                  id="title" 
                  value={newTaskTitle} 
                  onChange={e => setNewTaskTitle(e.target.value)} 
                  placeholder="e.g. Scrape latest docs"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc" className="font-mono text-xs">DESCRIPTION (OPTIONAL)</Label>
                <Textarea 
                  id="desc" 
                  value={newTaskDesc} 
                  onChange={e => setNewTaskDesc(e.target.value)} 
                  placeholder="Additional context..."
                  className="resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-mono text-xs">PRIORITY</Label>
                  <Select value={newTaskPriority} onValueChange={(val: any) => setNewTaskPriority(val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-mono text-xs">ASSIGNEE</Label>
                  <Select value={newTaskAssignee} onValueChange={setNewTaskAssignee}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {agents.map(a => (
                        <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" disabled={createTask.isPending} className="w-full mt-4">
                Create Task
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
        {COLUMNS.map(column => (
          <div key={column.id} className="w-80 flex-shrink-0 flex flex-col">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-mono text-xs font-semibold text-muted-foreground">{column.label}</h3>
              <span className="bg-muted px-2 py-0.5 rounded-sm text-[10px] font-mono">
                {tasks.filter(t => t.status === column.id).length}
              </span>
            </div>
            
            <div className="flex-1 bg-card/30 border border-border/50 rounded-md p-3 space-y-3 overflow-y-auto">
              {tasks.filter(t => t.status === column.id).map(task => (
                <div 
                  key={task.id} 
                  className="bg-card border border-border/80 rounded-sm p-3 shadow-sm hover:border-primary/50 transition-colors group relative"
                >
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 font-mono text-xs">
                        <div className="px-2 py-1.5 text-muted-foreground opacity-50 uppercase text-[10px]">Move to</div>
                        {COLUMNS.filter(c => c.id !== task.status).map(c => (
                          <DropdownMenuItem 
                            key={c.id}
                            onClick={() => updateTask.mutate({ id: task.id, data: { status: c.id } })}
                          >
                            {c.label}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuItem 
                          className="text-destructive focus:bg-destructive/10 focus:text-destructive mt-1 border-t border-border/50 rounded-none pt-2"
                          onClick={() => deleteTask.mutate({ id: task.id })}
                        >
                          <Trash2 className="w-3 h-3 mr-2" /> Delete Task
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <div className="pr-6">
                      <span className={cn(
                        "inline-block px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono uppercase mb-2",
                        task.priority === "high" ? "bg-destructive/20 text-destructive border border-destructive/20" :
                        task.priority === "medium" ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20" :
                        "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                      )}>
                        {task.priority}
                      </span>
                      <h4 className="text-sm font-medium leading-tight">{task.title}</h4>
                    </div>
                    
                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {task.description}
                      </p>
                    )}
                    
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-[10px] font-mono text-muted-foreground opacity-60">
                        #{task.id}
                      </div>
                      
                      {task.assigneeAgentId ? (
                        <div className="flex items-center gap-1.5 bg-muted/50 px-1.5 py-0.5 rounded-sm border border-border/50">
                          <div 
                            className="w-1.5 h-1.5 rounded-full" 
                            style={{ backgroundColor: task.assigneeAvatarColor || 'currentColor' }} 
                          />
                          <span className="text-[10px] font-mono truncate max-w-[80px]">
                            {task.assigneeAgentName}
                          </span>
                        </div>
                      ) : (
                        <div className="text-[10px] font-mono text-muted-foreground opacity-50 italic">
                          unassigned
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
