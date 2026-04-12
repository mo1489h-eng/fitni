import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Search, User } from "lucide-react";

const TrainerMobileClients = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, name, goal, phone, last_active_at, email")
        .eq("trainer_id", user.id)
        .order("name");
      setClients(data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">العملاء</h1>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#555" }} strokeWidth={1.5} />
        <input
          type="text"
          placeholder="بحث عن عميل..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border-0 py-3.5 pr-10 pl-4 text-sm text-white placeholder-gray-600 outline-none"
          style={{ background: "#161616" }}
        />
      </div>

      {/* Client List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl" style={{ background: "#161616" }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: "#111111" }}>
          <User className="mx-auto mb-2 h-8 w-8" style={{ color: "#333" }} strokeWidth={1.5} />
          <p className="text-sm" style={{ color: "#666" }}>لا يوجد عملاء</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((client) => (
            <div
              key={client.id}
              className="flex items-center gap-3 rounded-xl p-4 transition-all active:scale-[0.98]"
              style={{ background: "#111111" }}
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E" }}
              >
                {client.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-white">{client.name}</p>
                <p className="truncate text-xs" style={{ color: "#666" }}>{client.goal || client.phone}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrainerMobileClients;
