import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2, FileText, Users, TrendingUp, Trophy, Target,
  Heart, ChevronDown, ChevronUp, Share2, Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Report {
  performance_score: number;
  score_color: string;
  summary: string;
  physical_progress: {
    weight_change: number;
    body_fat_change: number | null;
    muscle_change: number | null;
    analysis: string;
  };
  training_consistency: {
    completed: number;
    expected: number;
    percentage: number;
    best_week: string;
    analysis: string;
  };
  nutrition: {
    meals_logged: number;
    analysis: string;
  };
  achievements: string[];
  next_month_goals: { goal: string; details: string }[];
  motivational_message: string;
}

const CopilotReports = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [report, setReport] = useState<{ report: Report; client_name: string; month: string } | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const { data: clients = [] } = useQuery({
    queryKey: ["copilot-report-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, goal, week_number")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const generateReport = useMutation({
    mutationFn: async (clientId: string) => {
      const { data, error } = await supabase.functions.invoke("copilot-report", {
        body: { client_id: clientId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setReport(data);
    },
    onError: (err: any) => {
      toast({ title: "خطأ في التوليد", description: err.message, variant: "destructive" });
    },
  });

  const handleGenerate = (clientId: string) => {
    setSelectedClient(clientId);
    setReport(null);
    generateReport.mutate(clientId);
  };

  const getScoreColor = (color: string) => {
    switch (color) {
      case "green": return "text-green-500 bg-green-500/10 border-green-500/20";
      case "yellow": return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
      case "red": return "text-red-500 bg-red-500/10 border-red-500/20";
      default: return "text-primary bg-primary/10 border-primary/20";
    }
  };

  const shareWhatsApp = (clientName: string) => {
    if (!report) return;
    const r = report.report;
    const text = `تقرير ${report.month} - ${clientName}\n\nالأداء: ${r.performance_score}/100\n${r.summary}\n\nالالتزام: ${r.training_consistency.percentage}%\n${r.motivational_message}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const toggle = (section: string) => setExpandedSection(expandedSection === section ? null : section);

  if (report) {
    const r = report.report;
    const client = clients.find(c => c.id === selectedClient);
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => { setReport(null); setSelectedClient(null); }}>
            رجوع للعملاء
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => shareWhatsApp(report.client_name)}>
              <Share2 className="w-3.5 h-3.5" strokeWidth={1.5} /> واتساب
            </Button>
          </div>
        </div>

        {/* Header */}
        <Card className="border-border bg-card overflow-hidden">
          <CardContent className="p-5 text-center">
            <p className="text-xs text-muted-foreground mb-1">{report.month}</p>
            <h2 className="text-lg font-bold text-foreground mb-3">تقرير {report.client_name} الشهري</h2>
            <div className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl border ${getScoreColor(r.score_color)}`}>
              <span className="text-3xl font-bold">{r.performance_score}</span>
              <span className="text-xs">/100</span>
            </div>
            <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">{r.summary}</p>
          </CardContent>
        </Card>

        {/* Physical Progress */}
        <Card className="border-border bg-card">
          <button onClick={() => toggle("physical")} className="w-full p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" strokeWidth={1.5} />
              <h3 className="font-bold text-foreground text-sm">التقدم الجسدي</h3>
            </div>
            {expandedSection === "physical" ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {expandedSection === "physical" && (
            <CardContent className="pt-0 pb-4 px-4">
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center bg-secondary rounded-lg p-2.5">
                  <p className={`text-sm font-bold ${(r.physical_progress.weight_change || 0) < 0 ? "text-green-500" : "text-red-500"}`}>
                    {(r.physical_progress.weight_change || 0) > 0 ? "+" : ""}{r.physical_progress.weight_change || 0} كجم
                  </p>
                  <p className="text-[10px] text-muted-foreground">الوزن</p>
                </div>
                {r.physical_progress.body_fat_change !== null && (
                  <div className="text-center bg-secondary rounded-lg p-2.5">
                    <p className={`text-sm font-bold ${(r.physical_progress.body_fat_change || 0) < 0 ? "text-green-500" : "text-red-500"}`}>
                      {(r.physical_progress.body_fat_change || 0) > 0 ? "+" : ""}{r.physical_progress.body_fat_change}%
                    </p>
                    <p className="text-[10px] text-muted-foreground">الدهون</p>
                  </div>
                )}
                {r.physical_progress.muscle_change !== null && (
                  <div className="text-center bg-secondary rounded-lg p-2.5">
                    <p className={`text-sm font-bold ${(r.physical_progress.muscle_change || 0) > 0 ? "text-green-500" : "text-red-500"}`}>
                      {(r.physical_progress.muscle_change || 0) > 0 ? "+" : ""}{r.physical_progress.muscle_change} كجم
                    </p>
                    <p className="text-[10px] text-muted-foreground">العضلات</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{r.physical_progress.analysis}</p>
            </CardContent>
          )}
        </Card>

        {/* Training */}
        <Card className="border-border bg-card">
          <button onClick={() => toggle("training")} className="w-full p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" strokeWidth={1.5} />
              <h3 className="font-bold text-foreground text-sm">الالتزام التدريبي</h3>
            </div>
            {expandedSection === "training" ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {expandedSection === "training" && (
            <CardContent className="pt-0 pb-4 px-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 bg-secondary rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min(r.training_consistency.percentage, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-foreground">{r.training_consistency.percentage}%</span>
              </div>
              <p className="text-xs text-muted-foreground mb-1">
                {r.training_consistency.completed} من {r.training_consistency.expected} جلسة
              </p>
              <p className="text-xs text-muted-foreground">{r.training_consistency.analysis}</p>
            </CardContent>
          )}
        </Card>

        {/* Achievements */}
        {r.achievements && r.achievements.length > 0 && (
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-warning" strokeWidth={1.5} />
                <h3 className="font-bold text-foreground text-sm">الإنجازات</h3>
              </div>
              <div className="space-y-2">
                {r.achievements.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-primary mt-0.5">*</span>
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Next Month Goals */}
        {r.next_month_goals && r.next_month_goals.length > 0 && (
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-primary" strokeWidth={1.5} />
                <h3 className="font-bold text-foreground text-sm">أهداف الشهر القادم</h3>
              </div>
              <div className="space-y-2">
                {r.next_month_goals.map((g, i) => (
                  <div key={i} className="bg-secondary rounded-lg p-3">
                    <p className="text-sm font-medium text-foreground">{g.goal}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{g.details}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Motivational */}
        {r.motivational_message && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 flex items-start gap-3">
              <Heart className="w-5 h-5 text-primary shrink-0 mt-0.5" strokeWidth={1.5} />
              <p className="text-sm text-foreground leading-relaxed">{r.motivational_message}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <FileText className="w-5 h-5 text-primary" strokeWidth={1.5} />
        <div>
          <h3 className="text-lg font-semibold text-foreground">التقارير الشهرية</h3>
          <p className="text-xs text-muted-foreground">اختر عميلاً لتوليد تقرير أداء شامل بالذكاء الاصطناعي</p>
        </div>
      </div>

      {generateReport.isPending && (
        <Card className="border-primary/20 bg-card">
          <CardContent className="p-8 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm font-medium text-foreground">الكوبايلت يحلل بيانات الشهر...</p>
            <p className="text-xs text-muted-foreground">يتم جمع بيانات التدريب والتغذية والقياسات</p>
          </CardContent>
        </Card>
      )}

      {!generateReport.isPending && clients.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {clients.map(client => (
            <button
              key={client.id}
              onClick={() => handleGenerate(client.id)}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-right transition-all duration-200 hover:border-primary/30 hover:bg-secondary"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {client.name.slice(0, 1)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{client.name}</p>
                <p className="text-xs text-muted-foreground">{client.goal || "هدف غير محدد"} - أسبوع {client.week_number}</p>
              </div>
              <FileText className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            </button>
          ))}
        </div>
      )}

      {clients.length === 0 && (
        <div className="text-center py-10">
          <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">أضف عملاء أولاً لتوليد التقارير</p>
        </div>
      )}
    </div>
  );
};

export default CopilotReports;
