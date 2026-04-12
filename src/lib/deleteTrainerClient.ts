import { supabase } from "@/integrations/supabase/client";

/** RLS: "Trainers can delete own clients". */
export async function deleteTrainerClientRow(clientId: string): Promise<void> {
  const { error } = await supabase.from("clients").delete().eq("id", clientId);
  if (error) throw new Error(error.message);
}

/**
 * Prefer the edge function (deletes client row + linked Auth user when deployed).
 * If the Functions gateway fails (e.g. "Failed to send request") or the function is missing,
 * fall back to a direct DELETE so the trainer can still remove the client from the list.
 */
export async function deleteTrainerClient(clientId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ success?: boolean; error?: string }>(
    "trainer-delete-client",
    { body: { client_id: clientId } }
  );
  const edgeOk = !error && !data?.error && data?.success;
  if (edgeOk) return;
  await deleteTrainerClientRow(clientId);
}
