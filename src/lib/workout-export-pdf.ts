import autoTable from "jspdf-autotable";
import jsPDF from "jspdf";

import type { WorkoutProgram } from "@/types/workout";

/**
 * Exports the active week program as a branded PDF table (CoachBase).
 *
 * Arabic / UTF-8: default Helvetica cannot render Arabic glyphs. For production, add a font
 * such as Cairo (Google Fonts) via `doc.addFont(cairoBase64, "Cairo", "normal")` and
 * `doc.setFont("Cairo")` with encoding `Identity-H` so Arabic renders correctly end-to-end.
 */
export function exportWorkoutProgramPdf(program: WorkoutProgram, fileBaseName = "program") {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  /** Right-to-left text direction so Arabic isn’t visually reversed in the PDF stream. */
  doc.setR2L(true);
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  doc.setFillColor(22, 163, 74);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text("CoachBase", margin, 14);
  doc.setFontSize(10);
  doc.text("Workout program", margin, 22);

  doc.setTextColor(40, 40, 40);
  let y = 34;
  doc.setFontSize(14);
  doc.text(program.title, margin, y);
  y += 7;
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  const descLines = doc.splitTextToSize(program.description || "—", pageW - 2 * margin);
  doc.text(descLines, margin, y);
  y += descLines.length * 4 + 8;

  const body: string[][] = [];
  for (const day of program.days) {
    if (day.exercises.length === 0) {
      body.push([day.title, day.type, "—", "—", "—", "—", "—", "—", "—"]);
      continue;
    }
    for (const we of day.exercises) {
      if (we.sets.length === 0) {
        body.push([day.title, day.type, we.exercise.name, "—", "—", "—", "—", "—", "—"]);
        continue;
      }
      we.sets.forEach((s, i) => {
        body.push([
          day.title,
          day.type,
          we.exercise.name,
          String(i + 1),
          s.type,
          s.weight != null ? String(s.weight) : "—",
          s.reps != null ? String(s.reps) : "—",
          s.rpe != null ? String(s.rpe) : "—",
          s.restTime != null ? `${s.restTime}s` : "—",
        ]);
      });
    }
  }

  autoTable(doc, {
    startY: y,
    head: [["Day", "Type", "Exercise", "Set", "S.type", "kg", "Reps", "RPE", "Rest"]],
    body,
    margin: { left: margin, right: margin },
    styles: { fontSize: 7, cellPadding: 1.2 },
    headStyles: { fillColor: [22, 163, 74], textColor: 255 },
    theme: "striped",
  });

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated ${new Date().toLocaleString()}`, margin, doc.internal.pageSize.getHeight() - 10);

  const safe = fileBaseName.replace(/[^\w\-]+/g, "_").slice(0, 80);
  doc.save(`${safe}.pdf`);
}
