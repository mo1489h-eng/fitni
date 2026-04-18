import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Search, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import TrainerMobileClientDetail from "./TrainerMobileClientDetail";
import { parseClientTrainingType, TRAINING_TYPE_LABEL_AR } from "@/lib/training-type";

type ClientRow = {
  id: string;
  name: string;
  goal: string | null;
  phone: string | null;
  last_active_at: string | null;
  email: string | null;
  training_type?: string;
};

const TrainerMobileClients = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const clientsQueryKey = ["trainer-mobile-clients", user?.id] as const;

  const { data: clients = [], isLoading } = useQuery({
    queryKey: clientsQueryKey,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, goal, phone, last_active_at, email, training_type")
        .eq("trainer_id", user.id)
        .order("name");
      if (error) throw error;
      return (data || []) as unknown as ClientRow[];
    },
    enabled: !!user,
  });

  const filtered = clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  if (selectedId) {
    return <TrainerMobileClientDetail clientId={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">العملاء</h1>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
        <input
          type="text"
          placeholder="بحث عن عميل..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border-0 bg-card py-3.5 pl-4 pr-10 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-card p-8 text-center">
          <User className="mx-auto mb-2 h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">لا يوجد عملاء</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((client) => (
            <button
              key={client.id}
              type="button"
              onClick={() => setSelectedId(client.id)}
              className="flex w-full items-center gap-3 rounded-xl bg-card p-4 text-right transition-all active:scale-[0.98]"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                {client.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{client.name}</p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      parseClientTrainingType(client.training_type) === "in_person"
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {TRAINING_TYPE_LABEL_AR[parseClientTrainingType(client.training_type)]}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{client.goal || client.phone || ""}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrainerMobileClients;
