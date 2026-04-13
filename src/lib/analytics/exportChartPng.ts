/** Capture a DOM node as PNG download (uses html2canvas from lockfile / jspdf dep). */
export async function exportElementToPng(
  el: HTMLElement | null,
  filename: string
): Promise<{ ok: boolean; error?: string }> {
  if (!el) return { ok: false, error: "no element" };
  try {
    const mod = await import("html2canvas");
    const html2canvas = mod.default;
    const canvas = await html2canvas(el, {
      backgroundColor: "#0a0a0a",
      scale: 2,
      logging: false,
      useCORS: true,
    });
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = filename.endsWith(".png") ? filename : `${filename}.png`;
    a.click();
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
