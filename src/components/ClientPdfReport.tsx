import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

interface ClientData {
  name: string;
  goal: string;
  week_number: number;
  subscription_price: number;
  subscription_end_date: string;
  last_workout_date: string;
  created_at: string;
}

interface Measurement {
  weight: number;
  fat_percentage: number;
  recorded_at: string;
}

interface ClientPdfReportProps {
  client: ClientData;
  measurements: Measurement[];
  trainerName?: string;
}

const ClientPdfReport = ({ client, measurements, trainerName }: ClientPdfReportProps) => {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const generatePdf = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      // Use built-in font (no Arabic shaping, but functional)
      doc.setFont("helvetica");

      const pageWidth = 210;
      const margin = 20;
      let y = 20;

      // Header bar
      doc.setFillColor(22, 163, 74); // green-600
      doc.rect(0, 0, pageWidth, 35, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text("fitni", pageWidth / 2, 15, { align: "center" });
      doc.setFontSize(10);
      doc.text("Monthly Client Report", pageWidth / 2, 25, { align: "center" });

      y = 45;

      // Client info section
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(16);
      doc.text(`Client: ${client.name}`, margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      const now = new Date();
      doc.text(`Report: ${now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`, margin, y);
      if (trainerName) {
        doc.text(`Trainer: ${trainerName}`, pageWidth - margin, y, { align: "right" });
      }
      y += 10;

      // Divider
      doc.setDrawColor(22, 163, 74);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      // Stats boxes
      const boxWidth = (pageWidth - 2 * margin - 15) / 4;
      const stats = getStats();

      stats.forEach((stat, i) => {
        const x = margin + i * (boxWidth + 5);
        doc.setFillColor(240, 253, 244);
        doc.roundedRect(x, y, boxWidth, 25, 3, 3, "F");

        doc.setFontSize(14);
        doc.setTextColor(22, 163, 74);
        doc.text(stat.value, x + boxWidth / 2, y + 10, { align: "center" });

        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(stat.label, x + boxWidth / 2, y + 18, { align: "center" });
      });

      y += 35;

      // Weight progress
      if (measurements.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(30, 30, 30);
        doc.text("Weight Progress", margin, y);
        y += 8;

        // Simple weight table
        const sorted = [...measurements].sort(
          (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
        );

        doc.setFontSize(9);
        // Header row
        doc.setFillColor(22, 163, 74);
        doc.setTextColor(255, 255, 255);
        doc.rect(margin, y, pageWidth - 2 * margin, 8, "F");
        doc.text("Date", margin + 5, y + 5.5);
        doc.text("Weight (kg)", margin + 60, y + 5.5);
        doc.text("Fat %", margin + 110, y + 5.5);
        doc.text("Change", margin + 145, y + 5.5);
        y += 8;

        doc.setTextColor(50, 50, 50);
        sorted.slice(-12).forEach((m, i) => {
          const prev = i > 0 ? sorted[i - 1] : null;
          const change = prev ? (Number(m.weight) - Number(prev.weight)).toFixed(1) : "—";
          const bgColor = i % 2 === 0 ? 255 : 248;

          doc.setFillColor(bgColor, bgColor, bgColor);
          doc.rect(margin, y, pageWidth - 2 * margin, 7, "F");

          doc.text(new Date(m.recorded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }), margin + 5, y + 5);
          doc.text(String(Number(m.weight)), margin + 60, y + 5);
          doc.text(Number(m.fat_percentage) > 0 ? `${Number(m.fat_percentage)}%` : "—", margin + 110, y + 5);

          if (change !== "—") {
            const num = parseFloat(change);
            if (num < 0) doc.setTextColor(22, 163, 74);
            else if (num > 0) doc.setTextColor(220, 38, 38);
            else doc.setTextColor(100, 100, 100);
            doc.text(`${num > 0 ? "+" : ""}${change}`, margin + 145, y + 5);
            doc.setTextColor(50, 50, 50);
          } else {
            doc.text("—", margin + 145, y + 5);
          }

          y += 7;
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
        });
      }

      y += 10;

      // Footer
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFillColor(245, 245, 245);
      doc.rect(0, 282, pageWidth, 15, "F");
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("Generated by fitni — Where Excellence Begins", pageWidth / 2, 289, { align: "center" });

      doc.save(`${client.name}_report_${now.getFullYear()}_${now.getMonth() + 1}.pdf`);
      toast({ title: "تم تحميل التقرير" });
    } catch (err: any) {
      toast({ title: "خطأ في إنشاء التقرير", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const getStats = () => {
    const now = Date.now();
    const lastWorkoutDays = Math.ceil((now - new Date(client.last_workout_date).getTime()) / 86400000);
    const commitmentPercent = Math.max(0, Math.min(100, Math.round((1 - Math.min(lastWorkoutDays, 7) / 7) * 100)));

    const sorted = [...measurements].sort(
      (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
    );
    const latestWeight = sorted[0]?.weight || 0;
    const thirtyDaysAgo = now - 30 * 86400000;
    const monthMeasurements = sorted.filter((m) => new Date(m.recorded_at).getTime() >= thirtyDaysAgo);
    const oldestThisMonth = monthMeasurements.length > 1 ? monthMeasurements[monthMeasurements.length - 1]?.weight : latestWeight;
    const weightChange = latestWeight && oldestThisMonth ? (Number(latestWeight) - Number(oldestThisMonth)).toFixed(1) : "0";

    return [
      { label: "Week", value: `${client.week_number}` },
      { label: "Commitment", value: `${commitmentPercent}%` },
      { label: "Weight (kg)", value: latestWeight ? `${Number(latestWeight)}` : "—" },
      { label: "Monthly Change", value: `${parseFloat(weightChange) > 0 ? "+" : ""}${weightChange} kg` },
    ];
  };

  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={generatePdf} disabled={generating}>
      {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
      تحميل التقرير الشهري
    </Button>
  );
};

export default ClientPdfReport;
