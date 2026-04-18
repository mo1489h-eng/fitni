import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type WalletRow = Tables<"wallets">;
export type TransactionRow = Tables<"transactions">;
export type WithdrawalRow = Tables<"withdrawals">;

export function useTrainerWallet(trainerId: string | undefined) {
  return useQuery({
    queryKey: ["wallet", trainerId],
    queryFn: async (): Promise<WalletRow | null> => {
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("trainer_id", trainerId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!trainerId,
  });
}

export function useTrainerTransactionCount(trainerId: string | undefined) {
  return useQuery({
    queryKey: ["transactions-count", trainerId],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("trainer_id", trainerId!);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!trainerId,
  });
}

export function useTrainerTransactionsPage(
  trainerId: string | undefined,
  page: number,
  pageSize: number,
) {
  return useQuery({
    queryKey: ["transactions", trainerId, page, pageSize],
    queryFn: async (): Promise<TransactionRow[]> => {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("trainer_id", trainerId!)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return (data ?? []) as TransactionRow[];
    },
    enabled: !!trainerId,
  });
}

/** Pending or in-review withdrawals that block a new request */
export function useTrainerActiveWithdrawals(trainerId: string | undefined) {
  return useQuery({
    queryKey: ["withdrawals-pending", trainerId],
    queryFn: async (): Promise<WithdrawalRow[]> => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .eq("trainer_id", trainerId!)
        .in("status", ["pending", "accepted"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WithdrawalRow[];
    },
    enabled: !!trainerId,
  });
}

/** Recent withdrawal requests (all statuses) for earnings UI */
export function useTrainerWithdrawalsHistory(trainerId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ["withdrawals-history", trainerId, limit],
    queryFn: async (): Promise<WithdrawalRow[]> => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .eq("trainer_id", trainerId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as WithdrawalRow[];
    },
    enabled: !!trainerId,
  });
}
