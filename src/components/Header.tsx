import { Code2, Github } from "lucide-react";
import { Button } from "@/components/ui/button";

const Header = () => {
  return (
    <header className="border-b-2 border-border bg-primary text-primary-foreground">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 border-2 border-primary-foreground bg-accent text-accent-foreground">
            <Code2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold uppercase tracking-tight leading-none">
              SEMANTIC PRESERVING CODE TRANSLATION
            </h1>
            <p className="text-xs opacity-70 font-mono uppercase tracking-widest">
              Hybrid Compiler–AI System
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="border-2 border-primary-foreground bg-transparent text-primary-foreground hover:bg-primary-foreground hover:text-primary font-bold uppercase tracking-wider rounded-none"
          >
            <a
              href="https://github.com/Jeevakrishna/semantic-code-weaver"
              target="_blank"
              rel="noopener noreferrer"
              className="gap-2"
            >
              <Github className="h-4 w-4" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
