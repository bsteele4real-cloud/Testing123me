import { useState, useRef, useEffect, type FormEvent } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { MessageContent } from "@/components/message-content";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Send, MessageSquare, ChevronLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toastError } from "@/lib/notify";
import { readList } from "@/lib/query";
import { useSearch } from "wouter";
import type { Message, Session, Agent } from "@workspace/api-client-react";

export default function ChatPage() {
  const queryClient = useQueryClient();
  const search = useSearch();
  const requestedAgentId = Number(new URLSearchParams(search).get("agent"));
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [showSessionList, setShowSessionList] = useState(true);
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  
  const sessionsQuery = useListSessions({ query: { queryKey: getListSessionsQueryKey() } });
  const agentsQuery = useListAgents({ query: { queryKey: getListAgentsQueryKey() } });
  const { items: sessions, failed: sessionsFailed } = readList<Session>(sessionsQuery.data, sessionsQuery.isError);
  const { items: agents, failed: agentsFailed } = readList<Agent>(agentsQuery.data, agentsQuery.isError);
  
  const messagesQuery = useListMessages(activeSessionId ?? 0, {
    query: {
      queryKey: getListMessagesQueryKey(activeSessionId ?? 0),
      enabled: !!activeSessionId
    }
  });
  const { items: messages, failed: messagesFailed } = readList<Message>(
    messagesQuery.data,
    Boolean(activeSessionId) && messagesQuery.isError,
  );

  const createSession = useCreateSession({
    mutation: {
      onSuccess: (newSession) => {
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
        setActiveSessionId(newSession.id);
        setIsNewSessionOpen(false);
        setNewSessionTitle("");
      },
      onError: (error) => toastError("Could not start session", error),
    }
  });

  const createMessage = useCreateMessage({
    mutation: {
      onSuccess: () => {
        pendingTextRef.current = null;
        setOptimisticMessage(null);
        setInputMessage("");
        queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(activeSessionId!) });
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
      },
      onError: (error) => {
        const failed = pendingTextRef.current ?? "";
        pendingTextRef.current = null;
        setOptimisticMessage(null);
        setInputMessage((current) => (current.trim() ? current : failed));
        toastError("Agent did not reply", error);
      },
    }
  });

  const [inputMessage, setInputMessage] = useState("");
  const [optimisticMessage, setOptimisticMessage] = useState<string | null>(null);
  const pendingTextRef = useRef<string | null>(null);
  const handledAgentRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!Number.isInteger(requestedAgentId) || requestedAgentId <= 0) return;
    if (handledAgentRef.current === requestedAgentId) return;
    if (sessionsQuery.isLoading || agentsQuery.isLoading) return;
    handledAgentRef.current = requestedAgentId;
    const match = sessions.find((session) => session.agentId === requestedAgentId);
    if (match) {
      setActiveSessionId(match.id);
      setShowSessionList(false);
      return;
    }
    if (agents.some((agent) => agent.id === requestedAgentId)) {
      setSelectedAgentId(requestedAgentId);
      setIsNewSessionOpen(true);
    }
  }, [requestedAgentId, sessions, agents, sessionsQuery.isLoading, agentsQuery.isLoading]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, optimisticMessage, createMessage.isPending]);

  const handleSendMessage = (e?: FormEvent) => {
    e?.preventDefault();
    const text = inputMessage.trim();
    if (!text || !activeSessionId || createMessage.isPending) return;

    pendingTextRef.current = text;
    setOptimisticMessage(text);
    setInputMessage("");
    setShowSessionList(false);
    createMessage.mutate({
      id: activeSessionId,
      data: { content: text }
    });
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
    <div className="flex h-full min-w-0 bg-background overflow-hidden">
      <div className={cn(
        "w-full md:w-80 border-r border-border/50 flex-col bg-card/30",
        showSessionList ? "flex" : "hidden md:flex",
      )}>
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
                      <button
                        type="button"
                        key={agent.id}
                        aria-pressed={selectedAgentId === agent.id}
                        className={cn(
                          "flex w-full items-center gap-3 p-2 rounded-md border text-left transition-colors",
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
                      </button>
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
          {sessionsQuery.isLoading && (
            <div role="status" className="p-4 text-xs text-muted-foreground font-mono">LOADING SESSIONS</div>
          )}
          {sessionsFailed && (
            <div role="alert" className="p-4 text-xs">
              Sessions could not be loaded.
              <button type="button" className="block mt-2 underline" onClick={() => sessionsQuery.refetch()}>Retry</button>
            </div>
          )}
          {agentsFailed && (
            <div role="alert" className="px-4 pb-2 text-xs">Agents could not be loaded.</div>
          )}
          {sessions.map(session => (
            <button
              type="button"
              key={session.id}
              aria-current={activeSessionId === session.id ? "true" : undefined}
              onClick={() => {
                setActiveSessionId(session.id);
                setShowSessionList(false);
              }}
              className={cn(
                "w-full text-left p-3 rounded-md transition-all border",
                activeSessionId === session.id 
                  ? "bg-accent/10 border-accent text-accent-foreground" 
                  : "bg-transparent border-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="font-medium text-sm truncate pr-2">{session.title}</div>
                {session.lastMessageAt && (
                  <div className="text-xs font-mono whitespace-nowrap text-muted-foreground">
                    {formatDistanceToNow(new Date(session.lastMessageAt), { addSuffix: false })}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: session.agentAvatarColor }} />
                <span className="truncate">{session.agentName}</span>
                <span className="px-1 py-0.5 bg-background border border-border/50 rounded-sm text-xs">{session.agentModel}</span>
              </div>
            </button>
          ))}
          {!sessionsQuery.isLoading && !sessionsFailed && sessions.length === 0 && (
            <div className="p-4 text-center text-xs text-muted-foreground font-mono">
              NO SESSIONS ACTIVE
            </div>
          )}
        </div>
      </div>

      <div className={cn(
        "flex-1 min-w-0 flex-col bg-background/50 relative",
        showSessionList ? "hidden md:flex" : "flex",
      )}>
        {activeSessionId && activeSession ? (
          <>
            {/* Header */}
            <div className="h-14 border-b border-border/50 flex items-center px-3 md:px-6 gap-2 bg-card/20 backdrop-blur-sm z-10 sticky top-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="md:hidden shrink-0"
                aria-label="Back to sessions"
                onClick={() => setShowSessionList(true)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
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
              {messagesFailed ? (
                <div role="alert" className="text-sm">
                  Messages could not be loaded.
                  <button type="button" className="block mt-2 underline" onClick={() => messagesQuery.refetch()}>Retry</button>
                </div>
              ) : messagesQuery.isLoading ? (
                <div role="status" className="text-sm text-muted-foreground">Loading messages…</div>
              ) : messages.length === 0 && !optimisticMessage ? (
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
                      <span className="text-muted-foreground">{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div 
                      className={cn(
                        "p-4 rounded-lg text-sm leading-relaxed [&_p]:my-1 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_code]:font-mono [&_a]:underline",
                        msg.role === "user" 
                          ? "bg-primary text-primary-foreground rounded-tr-sm" 
                          : "bg-card border border-border/50 rounded-tl-sm shadow-sm"
                      )}
                    >
                      <MessageContent content={msg.content} />
                    </div>
                  </div>
                ))
              )}
              {optimisticMessage && (
                <div className="max-w-[80%] ml-auto flex flex-col gap-1 items-end">
                  <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-1">
                    <span>YOU</span>
                    <span>sending</span>
                  </div>
                  <div className="p-4 rounded-lg rounded-tr-sm text-sm leading-relaxed bg-primary text-primary-foreground [&_p]:my-1 [&_a]:underline">
                    <MessageContent content={optimisticMessage} />
                  </div>
                </div>
              )}
              {createMessage.isPending && (
                <div className="mr-auto flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: activeSession.agentAvatarColor }} />
                  <span>{activeSession.agentName} is typing</span>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border/50 bg-card/20">
              <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative flex items-end">
                <Textarea
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={`Send a message to ${activeSession.agentName}...`}
                  className="w-full min-h-14 max-h-40 resize-none bg-background border-border/50 pr-12 text-sm font-sans focus-visible:ring-1 focus-visible:ring-primary shadow-sm"
                  disabled={createMessage.isPending}
                  rows={2}
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
                <span className="text-xs text-muted-foreground font-mono">Enter to send · Shift+Enter for a new line</span>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center flex-col text-muted-foreground">
            <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
            <h3 className="font-mono text-sm tracking-widest">NO SESSION SELECTED</h3>
            <p className="text-xs mt-2 text-muted-foreground">Select a session from the sidebar or create a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
