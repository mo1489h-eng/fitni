/**
 * Returns a proxied URL for exercise GIF images to bypass CORS restrictions.
 * Routes through our edge function which fetches the image server-side.
 */
export function getProxiedImageUrl(gifUrl: string | undefined): string {
  if (!gifUrl) return '';
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  return `https://${projectId}.supabase.co/functions/v1/exercise-image-proxy?url=${encodeURIComponent(gifUrl)}`;
}
