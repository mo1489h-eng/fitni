import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users, ClipboardList, CalendarDays, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SearchResult {
  clients: { id: string; name: string; goal: string }[];
  programs: { id: string; name: string; weeks: number }[];
  sessions: { id: string; session_date: string; client_name: string; session_type: string }[];
}

const GlobalSearch = ({ externalOpen, onExternalClose }: { externalOpen?: boolean; onExternalClose?: () => void } = {}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen ?? internalOpen;
  const setOpen = (v: boolean) => {
    setInternalOpen(v);
    if (!v && onExternalClose) onExternalClose();
  };
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult>({ clients: [], programs: [], sessions: [] });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen(true); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim() || !user) { setResults({ clients: [], programs: [], sessions: [] }); return; }
    setLoading(true);
    const [clientsRes, programsRes, sessionsRes] = await Promise.all([
      supabase.from("clients").select("id, name, goal").eq("trainer_id", user.id).ilike("name", `%${q}%`).limit(5),
      supabase.from("programs").select("id, name, weeks").eq("trainer_id", user.id).ilike("name", `%${q}%`).limit(5),
      supabase.from("trainer_sessions").select("id, session_date, session_type, client_id").eq("trainer_id", user.id).limit(5),
    ]);
    setResults({
      clients: (clientsRes.data as any) || [],
      programs: (programsRes.data as any) || [],
      sessions: (sessionsRes.data as any)?.map((s: any) => ({ ...s, client_name: "" })) || [],
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  const goTo = (path: string) => { navigate(path); setOpen(false); setQuery(""); };
  const hasResults = results.clients.length > 0 || results.programs.length > 0 || results.sessions.length > 0;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-background/95 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="w-full max-w-lg mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()} dir="rtl">
        <div className="rounded-2xl border border-border bg-card shadow-[0_24px_80px_rgba(0,0,0,0.7)] overflow-hidden">
          <div className="relative border-b border-border">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن عميل، برنامج، جلسة..."
              className="w-full bg-transparent pr-12 pl-12 py-4 text-base text-foreground placeholder:text-muted-foreground outline-none"
            />
            <button onClick={() => setOpen(false)} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>

          {query.trim() && (
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {!hasResults && !loading && (
                <div className="py-12 text-center">
                  <Search className="mx-auto h-12 w-12 text-muted-foreground/30" strokeWidth={1.5} />
                  <p className="mt-3 text-sm text-muted-foreground">لا توجد نتائج</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">جرّب البحث بكلمات أخرى</p>
                </div>
              )}

              {results.clients.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground">
                    <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
                    العملاء
                  </div>
                  {results.clients.map((c) => (
                    <button key={c.id} onClick={() => goTo(`/clients/${c.id}`)} className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">{c.name[0]}</div>
                      <div className="text-right">
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.goal}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results.programs.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground">
                    <ClipboardList className="h-3.5 w-3.5" strokeWidth={1.5} />
                    البرامج
                  </div>
                  {results.programs.map((p) => (
                    <button key={p.id} onClick={() => goTo("/programs")} className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <ClipboardList className="h-4 w-4 text-primary" strokeWidth={1.5} />
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.weeks} أسابيع</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!query.trim() && (
            <div className="p-4 text-center">
              <p className="text-xs text-muted-foreground">اكتب للبحث أو اضغط ESC للإغلاق</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
