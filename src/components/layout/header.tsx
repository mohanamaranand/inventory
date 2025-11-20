"use client";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

interface HeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
}

export function Header({ title, children, className }: HeaderProps) {
  const isMobile = useIsMobile();
  return (
    <header className="flex items-center justify-between gap-4 mb-8">
      <div className="flex items-center gap-4">
        {isMobile && <SidebarTrigger />}
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </header>
  );
}
