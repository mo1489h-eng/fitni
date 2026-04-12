import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Search, Trash2, User } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import TrainerMobileClientDetail from "./TrainerMobileClientDetail";

type ClientRow = {
  id: string;
  name: string;
  goal: string | null;
  phone: string | null;
  last_active_at: string | null;
  email: string | null;
};

const TrainerMobileClients = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClientRow | null>(null);

  const clientsQueryKey = ["trainer-mobile-clients", user?.id] as const;

  const { data: clients = [], isLoading } = useQuery({
    queryKey: clientsQueryKey,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, goal, phone, last_active_at, email")
        .eq("trainer_id", user.id)
        .order("name");
      if (error) throw error;
      return (data || []) as ClientRow[];
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const { data, error } = await supabase.functions.invoke<{ success?: boolean; error?: string }>(
        "trainer-delete-client",
        { body: { client_id: clientId } }
      );
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.success) throw new Error("فشل الحذف");
    },
    onMutate: async (clientId: string) => {
      await queryClient.cancelQueries({ queryKey: clientsQueryKey });
      const previous = queryClient.getQueryData<ClientRow[]>(clientsQueryKey);
      queryClient.setQueryData<ClientRow[]>(clientsQueryKey, (old) => (old ?? []).filter((c) => c.id !== clientId));
      if (selectedId === clientId) setSelectedId(null);
      return { previous };
    },
    onError: (err: Error, _clientId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(clientsQueryKey, context.previous);
      }
      toast({
        title: "تعذّر الحذف",
        description: err.message,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({ title: "تم حذف العميل بنجاح" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: clientsQueryKey });
    },
  });

  const filtered = clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    deleteMutation.mutate(id);
  };

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
            <div
              key={client.id}
              className="flex w-full items-stretch gap-2 rounded-xl transition-all"
              style={{ background: "#111111" }}
            >
              <button
                type="button"
                onClick={() => setSelectedId(client.id)}
                className="flex min-w-0 flex-1 items-center gap-3 p-4 text-right transition-all active:scale-[0.98]"
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
              <button
                type="button"
                aria-label="حذف العميل"
                disabled={deleteMutation.isPending}
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(client);
                }}
                className="flex shrink-0 items-center justify-center px-4 text-red-400 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
              >
                <Trash2 className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="border-0 text-right" style={{ background: "#161616" }} dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              هل أنت متأكد من حذف هذا العميل؟ لا يمكن التراجع عن هذا الإجراء
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogCancel className="border-white/10 bg-white/5 text-white hover:bg-white/10">
              إلغاء
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => confirmDelete()}
            >
              حذف
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TrainerMobileClients;
