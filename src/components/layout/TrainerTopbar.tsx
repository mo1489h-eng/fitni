import { Menu, Plus, Search } from "lucide-react";
import { motion } from "framer-motion";

import TrainerNotifications from "@/components/TrainerNotifications";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

import { ThemeToggle } from "./ThemeToggle";

export interface TrainerTopbarProps {
  title?: string;
  greeting: string;
  trainerName: string;
  avatarFallback: string;
  avatarUrl?: string | null;
  onSearch: () => void;
  onQuickAdd: () => void;
  onOpenMobileNav?: () => void;
}

/**
 * Sticky top bar: greeting/title, search, notifications, quick add, profile preview.
 * Exposes a menu control on small screens to open the full navigation drawer.
 */
export function TrainerTopbar({
  title,
  greeting,
  trainerName,
  avatarFallback,
  avatarUrl,
  onSearch,
  onQuickAdd,
  onOpenMobileNav,
}: TrainerTopbarProps) {
  const heading = title?.trim() || greeting;

  return (
    <motion.header
      initial={false}
      className="sticky inset-x-0 top-0 z-40 border-b border-border/60 bg-background/75 shadow-sm backdrop-blur-2xl supports-[backdrop-filter]:bg-background/65"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-4 md:px-6 md:py-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 border-border bg-card/80 transition-all duration-300 ease-in-out hover:border-primary/30 hover:shadow-md active:scale-95 md:hidden"
            onClick={onOpenMobileNav}
            aria-label="فتح القائمة"
          >
            <Menu className="h-5 w-5" strokeWidth={1.5} />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight text-foreground md:text-2xl">{heading}</h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={onSearch}
            className="hidden h-11 items-center gap-2 rounded-full border border-border bg-card/70 px-4 text-sm text-muted-foreground transition-all duration-300 ease-in-out hover:border-primary/30 hover:text-foreground hover:shadow-md active:scale-95 md:flex"
          >
            <Search className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            <span>بحث...</span>
            <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground/60 lg:inline">
              ⌘K
            </kbd>
          </button>

          <ThemeToggle />

          <TrainerNotifications />

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-full border-border bg-card/70 transition-all duration-300 ease-in-out hover:border-primary/30 hover:text-primary hover:shadow-md active:scale-95"
            onClick={onQuickAdd}
            aria-label="إضافة سريعة"
          >
            <Plus className="h-5 w-5" strokeWidth={1.5} />
          </Button>

          <Avatar className="h-11 w-11 border border-border shadow-sm">
            <AvatarImage src={avatarUrl ?? undefined} alt={trainerName} />
            <AvatarFallback className="bg-card text-sm font-bold text-foreground">{avatarFallback}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </motion.header>
  );
}
