import { useState, useRef, useEffect } from "react";
import { 
  useListSessions, getListSessionsQueryKey, 
  useListMessages, getListMessagesQueryKey, 
  useCreateMessage, 
  useListAgents, getListAgentsQueryKey,
  useCreateSession
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Send, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const queryClient = useQueryClient();
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  
  const { data: sessions = [] } = useListSessions({ query: { queryKey: getListSessionsQueryKey() } });
  const { data: agents = [] } = useListAgents({ query: { queryKey: getListAgentsQueryKey() } });
  
  const { data: messages = [] } = useListMessages(activeSessionId!, {
    query: {
      queryKey: getListMessagesQueryKey(activeSessionId!),
      enabled: !!activeSessionId
    }
  });

  const createSession = useCreateSession({
    mutation: {
      onSuccess: (newSession) => {
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
        setActiveSessionId(newSession.id);
        setIsNewSessionOpen(false);
        setNewSessionTitle("");
      }
    }
  });

  const createMessage = useCreateMessage({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(activeSessionId!) });
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
      }
    }
  });

  const [inputMessage, setInputMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeSessionId) return;
    
    createMessage.mutate({
      id: activeSessionId,
      data: { content: inputMessage }
    });
    setInputMessage("");
  };

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgentId) return;
    createSession.mutate({
      data: {
        title: newSessionTitle || "New Session",
        agentId: selectedAgentId
      }
    });
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* Sessions Sidebar */}
      <div className="w-80 border-r border-border/50 flex flex-col bg-card/30">
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <h2 className="font-mono text-sm font-semibold tracking-wider">SESSIONS</h2>
          <Dialog open={isNewSessionOpen} onOpenChange={setIsNewSessionOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-6 w-6">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] border-border bg-card">
              <DialogHeader>
                <DialogTitle className="font-mono text-sm">NEW SESSION</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateSession} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="font-mono text-xs">TITLE (OPTIONAL)</Label>
                  <Input 
                    id="title" 
                    value={newSessionTitle} 
                    onChange={e => setNewSessionTitle(e.target.value)} 
                    placeholder="e.g. Project brainstorm"
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-mono text-xs">SELECT AGENT</Label>
                  <div className="grid gap-2 max-h-48 overflow-auto pr-2">
                    {agents.map(agent => (
                      <div 
                        key={agent.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-md border cursor-pointer transition-colors",
                          selectedAgentId === agent.id 
                            ? "border-primary bg-primary/10" 
                            : "border-border hover:border-border/80 hover:bg-muted/50"
                        )}
                        onClick={() => setSelectedAgentId(agent.id)}
                      >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: agent.avatarColor }} />
                        <div className="flex-1 overflow-hidden">
                          <div className="text-sm font-medium truncate">{agent.name}</div>
                          <div className="text-xs text-muted-foreground font-mono truncate">{agent.model}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <Button type="submit" disabled={!selectedAgentId || createSession.isPending} className="w-full">
                  Start Session
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.map(session => (
            <div 
              key={session.id}
              onClick={() => setActiveSessionId(session.id)}
              className={cn(
                "p-3 rounded-md cursor-pointer transition-all border group",
                activeSessionId === session.id 
                  ? "bg-accent/10 border-accent text-accent-foreground" 
                  : "bg-transparent border-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="font-medium text-sm truncate pr-2">{session.title}</div>
                {session.lastMessageAt && (
                  <div className="text-[10px] font-mono whitespace-nowrap opacity-50">
                    {formatDistanceToNow(new Date(session.lastMessageAt), { addSuffix: false })}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs font-mono opacity-70">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: session.agentAvatarColor }} />
                <span className="truncate">{session.agentName}</span>
                <span className="px-1 py-0.5 bg-background border border-border/50 rounded-sm text-[9px]">{session.agentModel}</span>
              </div>
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="p-4 text-center text-xs text-muted-foreground font-mono">
              NO SESSIONS ACTIVE
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-background/50 relative">
        {activeSessionId && activeSession ? (
          <>
            {/* Header */}
            <div className="h-14 border-b border-border/50 flex items-center px-6 bg-card/20 backdrop-blur-sm z-10 sticky top-0">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)]" style={{ backgroundColor: activeSession.agentAvatarColor }} />
                <div>
                  <div className="text-sm font-semibold flex items-center gap-2">
                    {activeSession.title}
                    <span className="text-xs font-normal text-muted-foreground font-mono px-1.5 py-0.5 rounded-sm bg-muted">
                      {activeSession.agentName}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground font-mono">
                  [ System: Connection established with {activeSession.agentName}. Awaiting input. ]
                </div>
              ) : (
                messages.map(msg => (
                  <div 
                    key={msg.id} 
                    className={cn(
                      "max-w-[80%] flex flex-col gap-1",
                      msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-1">
                      {msg.role === "assistant" && (
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeSession.agentAvatarColor }} />
                      )}
                      <span>{msg.role === "user" ? "YOU" : activeSession.agentName.toUpperCase()}</span>
                      <span className="opacity-40">{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div 
                      className={cn(
                        "p-4 rounded-lg text-sm leading-relaxed",
                        msg.role === "user" 
                          ? "bg-primary text-primary-foreground rounded-tr-sm" 
                          : "bg-card border border-border/50 rounded-tl-sm shadow-sm"
                      )}
                    >
                      {msg.content.split('\n').map((line, i) => (
                        <span key={i}>
                          {line}
                          {i !== msg.content.split('\n').length - 1 && <br />}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border/50 bg-card/20">
              <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative flex items-end">
                <Input
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  placeholder={`Send a message to ${activeSession.agentName}...`}
                  className="w-full bg-background border-border/50 pr-12 py-6 text-sm font-sans focus-visible:ring-1 focus-visible:ring-primary shadow-sm"
                  disabled={createMessage.isPending}
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  className="absolute right-2 bottom-2 h-8 w-8 rounded-sm"
                  disabled={!inputMessage.trim() || createMessage.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
              <div className="text-center mt-2">
                <span className="text-[10px] text-muted-foreground font-mono">AGENTIC OS // TERMINAL CHAT INTERFACE v1.0</span>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center flex-col text-muted-foreground">
            <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
            <h3 className="font-mono text-sm tracking-widest">NO SESSION SELECTED</h3>
            <p className="text-xs mt-2 opacity-50">Select a session from the sidebar or create a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
