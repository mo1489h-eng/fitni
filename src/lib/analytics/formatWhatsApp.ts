export function formatWhatsApp(phone?: string): string {
  return `https://wa.me/966${(phone || "").replace(/^0/, "")}`;
}
