import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Search, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import TrainerMobileClientDetail from "./TrainerMobileClientDetail";

const TrainerMobileClients = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["trainer-mobile-clients", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, goal, phone, last_active_at, email")
        .eq("trainer_id", user.id)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const filtered = clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  if (selectedId) {
    return <TrainerMobileClientDetail clientId={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">العملاء</h1>

      <div className="relative">
        <Search
          className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
          style={{ color: "#555" }}
          strokeWidth={1.5}
        />
        <input
          type="text"
          placeholder="بحث عن عميل..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border-0 py-3.5 pl-4 pr-10 text-sm text-white placeholder-gray-600 outline-none"
          style={{ background: "#161616" }}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl" style={{ background: "#161616" }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: "#111111" }}>
          <User className="mx-auto mb-2 h-8 w-8" style={{ color: "#333" }} strokeWidth={1.5} />
          <p className="text-sm" style={{ color: "#666" }}>
            لا يوجد عملاء
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((client) => (
            <button
              key={client.id}
              type="button"
              onClick={() => setSelectedId(client.id)}
              className="flex w-full items-center gap-3 rounded-xl p-4 text-right transition-all active:scale-[0.98]"
              style={{ background: "#111111" }}
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E" }}
              >
                {client.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{client.name}</p>
                <p className="truncate text-xs" style={{ color: "#666" }}>
                  {client.goal || client.phone || ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrainerMobileClients;
