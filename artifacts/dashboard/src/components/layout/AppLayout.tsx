import { Sidebar } from "./Sidebar";
import { ReactNode, useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-64 max-w-[16rem] p-0 [&>button]:text-sidebar-foreground">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <Sidebar onNavigate={() => setNavOpen(false)} className="h-full w-full border-r-0" />
        </SheetContent>
      </Sheet>
      <main className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        <div className="md:hidden flex items-center gap-2 h-12 shrink-0 px-3 border-b border-border bg-sidebar">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Open navigation"
            onClick={() => setNavOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <span className="font-mono text-sm font-bold tracking-tight">AGENTIC OS</span>
        </div>
        {children}
      </main>
    </div>
  );
}
