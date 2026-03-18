import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, FileSpreadsheet, Download, Loader2, CheckCircle, AlertTriangle,
  Zap, ArrowLeft,
} from "lucide-react";


interface ImportClientsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "method" | "mapping" | "preview" | "done";

interface RawRow {
  [key: string]: any;
}

interface MappedClient {
  name: string;
  phone: string;
  goal: string;
  subscription_price: number;
  subscription_end_date: string;
  valid: boolean;
  error?: string;
}

const COLUMN_FIELDS = [
  { key: "name", label: "الاسم", required: true },
  { key: "phone", label: "رقم الجوال", required: false },
  { key: "goal", label: "الهدف", required: false },
  { key: "subscription_price", label: "سعر الاشتراك", required: false },
  { key: "subscription_end_date", label: "تاريخ نهاية الاشتراك", required: false },
];

const ImportClientsModal = ({ open, onOpenChange }: ImportClientsModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("method");
  const [rawData, setRawData] = useState<RawRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [mappedClients, setMappedClients] = useState<MappedClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [manualText, setManualText] = useState("");

  const resetState = () => {
    setStep("method");
    setRawData([]);
    setColumns([]);
    setMapping({});
    setMappedClients([]);
    setLoading(false);
    setManualText("");
  };

  const handleClose = () => {
    onOpenChange(false);
    window.setTimeout(resetState, 300);
  };

  const parseCsv = (text: string): RawRow[] => {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const row: RawRow = {};
      headers.forEach((h, i) => { row[h] = values[i] || ""; });
      return row;
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const json = parseCsv(text);
        if (json.length === 0) {
          toast({ title: "الملف فارغ", variant: "destructive" });
          return;
        }
        const cols = Object.keys(json[0]);
        setRawData(json);
        setColumns(cols);

        const autoMap: Record<string, string> = {};
        COLUMN_FIELDS.forEach((field) => {
          const match = cols.find((c) =>
            c.includes(field.label) || c.toLowerCase().includes(field.key)
          );
          if (match) autoMap[field.key] = match;
        });
        setMapping(autoMap);
        setStep("mapping");
      } catch {
        toast({ title: "خطأ في قراءة الملف", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleManualPaste = () => {
    if (!manualText.trim()) return;
    const lines = manualText.trim().split("\n").filter(Boolean);
    const parsed: MappedClient[] = lines.map((line) => {
      const parts = line.split(/[,،\t]/).map((p) => p.trim());
      const name = parts[0] || "";
      const phone = parts[1] || "";
      const goal = parts[2] || "";
      const price = parseFloat(parts[3]) || 0;
      return {
        name,
        phone,
        goal,
        subscription_price: price,
        subscription_end_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        valid: !!name,
        error: !name ? "الاسم مطلوب" : undefined,
      };
    });
    setMappedClients(parsed);
    setStep("preview");
  };

  const downloadTemplate = () => {
    const headers = ["الاسم", "رقم الجوال", "الهدف", "سعر الاشتراك", "تاريخ نهاية الاشتراك"];
    const rows = [
      ["أحمد محمد", "0501234567", "تخسيس", "500", "2026-04-01"],
      ["سارة علي", "0559876543", "بناء عضلات", "800", "2026-05-15"],
    ];
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fitni_clients_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyMapping = () => {
    if (!mapping.name) {
      toast({ title: "يجب تحديد عمود الاسم", variant: "destructive" });
      return;
    }

    const parsed: MappedClient[] = rawData.map((row) => {
      const name = String(row[mapping.name] || "").trim();
      const phone = mapping.phone ? String(row[mapping.phone] || "").trim() : "";
      const goal = mapping.goal ? String(row[mapping.goal] || "").trim() : "";
      const price = mapping.subscription_price ? parseFloat(row[mapping.subscription_price]) || 0 : 0;

      let endDate = "";
      if (mapping.subscription_end_date && row[mapping.subscription_end_date]) {
        const raw = row[mapping.subscription_end_date];
        if (typeof raw === "number") {
          // Excel serial date
          const d = new Date((raw - 25569) * 86400000);
          endDate = d.toISOString().split("T")[0];
        } else {
          const d = new Date(raw);
          endDate = isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
        }
      }
      if (!endDate) {
        endDate = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
      }

      return {
        name,
        phone,
        goal,
        subscription_price: price,
        subscription_end_date: endDate,
        valid: !!name,
        error: !name ? "الاسم مطلوب" : undefined,
      };
    });

    setMappedClients(parsed);
    setStep("preview");
  };

  const handleImport = async () => {
    if (!user) return;
    setLoading(true);
    const valid = mappedClients.filter((c) => c.valid);
    const skipped = mappedClients.filter((c) => !c.valid);

    try {
      if (valid.length > 0) {
        const toInsert = valid.map((c) => ({
          trainer_id: user.id,
          name: c.name,
          phone: c.phone,
          goal: c.goal,
          subscription_price: c.subscription_price,
          subscription_end_date: c.subscription_end_date,
        }));
        const { error } = await supabase.from("clients").insert(toInsert);
        if (error) throw error;
      }

      setImportedCount(valid.length);
      setSkippedCount(skipped.length);
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setStep("done");
    } catch (err: any) {
      toast({ title: "خطأ في الاستيراد", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : handleClose())}>
      <DialogContent data-tour="import-clients-modal" className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            استيراد بيانات العملاء
          </DialogTitle>
        </DialogHeader>

        {/* STEP 1: Method */}
        {step === "method" && (
          <div className="space-y-3">
            {/* Upload Excel/CSV */}
            <Card
              className="p-4 cursor-pointer hover:shadow-md transition-shadow border-primary/20 hover:border-primary/40"
              onClick={() => fileRef.current?.click()}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-card-foreground">رفع ملف Excel/CSV</p>
                  <p className="text-xs text-muted-foreground">ارفع ملف Google Sheets أو Excel</p>
                </div>
              </div>
            </Card>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />

            {/* Manual entry */}
            <Card className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-card-foreground">إدخال يدوي سريع</p>
                  <p className="text-xs text-muted-foreground">الصق البيانات مباشرة (سطر لكل عميل)</p>
                </div>
              </div>
              <textarea
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[100px] placeholder:text-muted-foreground"
                placeholder={"أحمد محمد, 0501234567, تخسيس, 500\nسارة علي, 0559876543, بناء عضلات, 800"}
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                dir="rtl"
              />
              <Button size="sm" className="mt-2 w-full" disabled={!manualText.trim()} onClick={handleManualPaste}>
                معاينة البيانات
              </Button>
            </Card>

            {/* Download template */}
            <Card
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={downloadTemplate}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Download className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-card-foreground">تحميل نموذج جاهز</p>
                  <p className="text-xs text-muted-foreground">حمّل النموذج واملأه ثم ارفعه</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* STEP 2: Column Mapping */}
        {step === "mapping" && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => setStep("method")}>
              <ArrowLeft className="w-4 h-4" /> رجوع
            </Button>

            <p className="text-sm text-muted-foreground">تم العثور على {rawData.length} سجل و {columns.length} أعمدة</p>

            <div className="space-y-3">
              {COLUMN_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground w-32 flex-shrink-0">
                    {field.label}
                    {field.required && <span className="text-destructive mr-0.5">*</span>}
                  </span>
                  <Select value={mapping[field.key] || ""} onValueChange={(v) => setMapping((m) => ({ ...m, [field.key]: v }))}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="اختر العمود" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((col) => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Preview first 3 rows */}
            {rawData.length > 0 && mapping.name && (
              <div className="rounded-lg bg-secondary p-3">
                <p className="text-xs font-bold text-muted-foreground mb-2">معاينة (أول 3 سجلات):</p>
                {rawData.slice(0, 3).map((row, i) => (
                  <p key={i} className="text-xs text-secondary-foreground truncate">
                    {row[mapping.name]} {mapping.phone ? `• ${row[mapping.phone]}` : ""}
                  </p>
                ))}
              </div>
            )}

            <Button className="w-full" disabled={!mapping.name} onClick={applyMapping}>
              التالي: معاينة البيانات
            </Button>
          </div>
        )}

        {/* STEP 3: Preview */}
        {step === "preview" && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => rawData.length > 0 ? setStep("mapping") : setStep("method")}>
              <ArrowLeft className="w-4 h-4" /> رجوع
            </Button>

            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-center">
              <p className="text-sm font-medium">سيتم إضافة <span className="text-primary font-bold">{mappedClients.filter((c) => c.valid).length}</span> عميل</p>
              {mappedClients.filter((c) => !c.valid).length > 0 && (
                <p className="text-xs text-destructive mt-1">
                  {mappedClients.filter((c) => !c.valid).length} سجل به أخطاء سيتم تخطيه
                </p>
              )}
            </div>

            <div className="space-y-1 max-h-60 overflow-y-auto">
              {mappedClients.map((c, i) => (
                <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-sm ${c.valid ? "bg-secondary" : "bg-destructive/5 border border-destructive/20"}`}>
                  {c.valid ? (
                    <CheckCircle className="w-3.5 h-3.5 text-success flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                  )}
                  <span className={`flex-1 truncate ${c.valid ? "text-secondary-foreground" : "text-destructive"}`}>
                    {c.name || "(بدون اسم)"} {c.phone && `• ${c.phone}`}
                  </span>
                  {c.subscription_price > 0 && (
                    <span className="text-xs text-muted-foreground">{c.subscription_price} ر.س</span>
                  )}
                </div>
              ))}
            </div>

            <Button className="w-full" onClick={handleImport} disabled={loading || mappedClients.filter((c) => c.valid).length === 0}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `استيراد ${mappedClients.filter((c) => c.valid).length} عميل`}
            </Button>
          </div>
        )}

        {/* STEP 4: Done */}
        {step === "done" && (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <p className="text-lg font-bold text-foreground">تم استيراد {importedCount} عميل بنجاح</p>
            {skippedCount > 0 && (
              <p className="text-sm text-muted-foreground">تم تخطي {skippedCount} سجل بسبب بيانات ناقصة</p>
            )}
            <Button className="w-full" onClick={handleClose}>إغلاق</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImportClientsModal;
