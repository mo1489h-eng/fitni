/** DB `clients.training_type` — drives trainer Session Mode vs online-only. */
export type ClientTrainingType = "in_person" | "online";

export function parseClientTrainingType(raw: string | null | undefined): ClientTrainingType {
  return raw === "in_person" ? "in_person" : "online";
}

export const TRAINING_TYPE_LABEL_AR: Record<ClientTrainingType, string> = {
  in_person: "حضوري",
  online: "أونلاين",
};
