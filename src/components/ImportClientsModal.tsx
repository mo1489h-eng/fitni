import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileSpreadsheet,
  Download,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Zap,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  IMPORT_FIELD_DEFS,
  guessColumnMapping,
  buildMappedRow,
  markDuplicatePhonesInFile,
  toClientInserts,
  parseSpreadsheetToRows,
  type ImportFieldKey,
  type MappedImportRow,
  type ClientInsert,
} from "@/lib/clientSpreadsheetImport";
import { getAuthSiteOrigin } from "@/lib/auth-constants";
import { isValidSignupEmail } from "@/lib/email-validation";
import { parseSendInviteEmailInvoke } from "@/lib/sendInviteEmailResult";

export interface ImportClientsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** How many more clients the plan allows (use Infinity for unlimited). */
  slotsRemaining?: number;
}

type Step = "method" | "mapping" | "preview" | "done";

const CORE_FIELDS = IMPORT_FIELD_DEFS.filter((f) => f.group === "core");
const EXTRA_FIELDS = IMPORT_FIELD_DEFS.filter((f) => f.group === "extra");

export default function ImportClientsModal({
  open,
  onOpenChange,
  slotsRemaining = Number.POSITIVE_INFINITY,
}: ImportClientsModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("method");
  const [rawData, setRawData] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Partial<Record<ImportFieldKey, string>>>({});
  const [mappedClients, setMappedClients] = useState<MappedImportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [cappedCount, setCappedCount] = useState(0);
  const [manualText, setManualText] = useState("");
  const [showExtraMapping, setShowExtraMapping] = useState(true);

  const defaultEndDate = useMemo(
    () => new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    [],
  );

  const resetState = () => {
    setStep("method");
    setRawData([]);
    setColumns([]);
    setMapping({});
    setMappedClients([]);
    setLoading(false);
    setManualText("");
    setCappedCount(0);
    setShowExtraMapping(true);
  };

  const handleClose = () => {
    onOpenChange(false);
    window.setTimeout(resetState, 300);
  };

  const applyRowsAndMapping = (
    rows: Record<string, unknown>[],
    map: Partial<Record<ImportFieldKey, string>>,
  ) => {
    if (rows.length === 0) {
      toast({ title: "لا توجد بيانات في الملف", variant: "destructive" });
      return;
    }
    const cols = Object.keys(rows[0] ?? {});
    setRawData(rows);
    setColumns(cols);
    const merged = { ...guessColumnMapping(cols), ...map };
    setMapping(merged);
    setStep("mapping");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const lower = file.name.toLowerCase();
      if (
        !lower.endsWith(".csv") &&
        !lower.endsWith(".xlsx") &&
        !lower.endsWith(".xls") &&
        !lower.endsWith(".ods")
      ) {
        toast({
          title: "صيغة غير مدعومة",
          description: "استخدم Excel (.xlsx) أو CSV",
          variant: "destructive",
        });
        return;
      }
      const rows = await parseSpreadsheetToRows(file);
      if (rows.length === 0) {
        toast({ title: "الملف فارغ أو لا يحتوي صفوف بيانات", variant: "destructive" });
        return;
      }
      applyRowsAndMapping(rows, {});
    } catch {
      toast({ title: "تعذر قراءة الملف", description: "تأكد أن الملف غير مفتوح في برنامج آخر", variant: "destructive" });
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleManualPaste = () => {
    if (!manualText.trim()) return;
    const lines = manualText.trim().split(/\n/).filter(Boolean);
    const rows: Record<string, unknown>[] = lines.map((line) => {
      const parts = line.split(/[,،\t]/).map((p) => p.trim());
      return {
        الاسم: parts[0] ?? "",
        الجوال: parts[1] ?? "",
        الهدف: parts[2] ?? "",
        السعر: parts[3] ?? "",
      };
    });
    applyRowsAndMapping(rows, {
      name: "الاسم",
      phone: "الجوال",
      goal: "الهدف",
      subscription_price: "السعر",
    });
  };

  const downloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const headers = [
      "الاسم الكامل",
      "رقم الجوال",
      "البريد الإلكتروني",
      "الهدف التدريبي",
      "سعر الاشتراك",
      "نهاية الاشتراك",
      "العمر",
      "الوزن",
      "الطول",
      "الخبرة",
      "أيام التمرين بالأسبوع",
      "ملاحظات",
      "نوع التدريب",
      "جلسات شهرياً",
      "أسبوع البرنامج",
    ];
    const sample = [
      "أحمد محمد",
      "0501234567",
      "ahmed@example.com",
      "تخسيس",
      "500",
      "2026-12-31",
      "28",
      "80",
      "175",
      "مبتدئ",
      "4",
      "",
      "أونلاين",
      "0",
      "1",
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "عملاء");
    XLSX.writeFile(wb, "CoachBase_import_clients.xlsx");
  };

  const applyMapping = () => {
    if (!mapping.name) {
      toast({ title: "حدد عمود الاسم", variant: "destructive" });
      return;
    }
    let parsed: MappedImportRow[] = rawData.map((row) => buildMappedRow(row, mapping, defaultEndDate));
    parsed = markDuplicatePhonesInFile(parsed);
    setMappedClients(parsed);
    setStep("preview");
  };

  const validRows = mappedClients.filter((c) => c.valid);
  const cap =
    Number.isFinite(slotsRemaining) && slotsRemaining >= 0 ? Math.floor(slotsRemaining) : Number.POSITIVE_INFINITY;
  const willImport = Math.min(validRows.length, cap);
  const overCap = validRows.length > cap && Number.isFinite(cap);

  const handleImport = async () => {
    if (!user) return;
    setLoading(true);
    const valid = mappedClients.filter((c) => c.valid);
    const skipped = mappedClients.filter((c) => !c.valid);
    const maxRows = Number.isFinite(cap) ? cap : valid.length;
    const batch = valid.slice(0, maxRows);
    const extraSkipped = valid.length - batch.length;

    try {
      type InsertedRow = { id: string; invite_token: string | null; email: string | null; name: string | null };
      const allInserted: InsertedRow[] = [];
      let inviteEligible = 0;
      let invitesSent = 0;

      if (batch.length > 0) {
        const { data: trainerProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .maybeSingle();
        const trainerName = trainerProfile?.full_name?.trim() || "مدربك";
        const siteOrigin = getAuthSiteOrigin();

        const today = new Date().toISOString().split("T")[0];
        const inserts = toClientInserts(batch, user.id, today);
        const CHUNK = 40;
        for (let i = 0; i < inserts.length; i += CHUNK) {
          const chunk = inserts.slice(i, i + CHUNK);
          const { data: inserted, error } = await supabase
            .from("clients")
            .insert(chunk as ClientInsert[])
            .select("id, invite_token, email, name");
          if (error) throw error;
          if (inserted?.length) allInserted.push(...(inserted as InsertedRow[]));
        }

        for (const row of allInserted) {
          const emailTrim = (row.email ?? "").trim();
          if (!emailTrim || !isValidSignupEmail(emailTrim)) continue;
          if (!row.invite_token || !row.id) continue;
          inviteEligible += 1;
          const { data: emailResult, error: fnError } = await supabase.functions.invoke("send-invite-email", {
            body: {
              clientId: row.id,
              clientName: (row.name ?? "عميل").trim() || "عميل",
              clientEmail: emailTrim,
              trainerName,
              inviteToken: row.invite_token,
              siteOrigin,
            },
          });
          const { payload } = await parseSendInviteEmailInvoke(emailResult, fnError);
          if (payload?.emailSent) invitesSent += 1;
        }
      }

      setImportedCount(batch.length);
      setSkippedCount(skipped.length);
      setCappedCount(extraSkipped);
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client-count"] });
      queryClient.invalidateQueries({ queryKey: ["copilot-trainer-clients"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-clients"] });
      setStep("done");
      if (inviteEligible > 0) {
        toast({
          title: "تم إرسال الدعوات",
          description: `تم إرسال ${invitesSent} دعوة من أصل ${inviteEligible}`,
        });
      }
      if (extraSkipped > 0) {
        toast({
          title: "تم الاستيراد مع حد الباقة",
          description: `تم تخطي ${extraSkipped} عميل لأن الحد المسموح للعملاء اكتمل. ترقَّ للاحترافي لزيادة الحد.`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "خطأ غير معروف";
      toast({ title: "فشل الاستيراد", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const NONE = "__none__";

  const renderFieldSelect = (field: (typeof IMPORT_FIELD_DEFS)[number]) => (
    <div key={field.key} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
      <span className="text-sm font-medium text-foreground sm:w-40 sm:flex-shrink-0">
        {field.label}
        {field.required && <span className="text-destructive mr-0.5">*</span>}
      </span>
      <Select
        value={mapping[field.key] ?? NONE}
        onValueChange={(v) =>
          setMapping((m) => ({ ...m, [field.key]: v === NONE ? undefined : v }))
        }
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="— تجاهل —" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>— تجاهل —</SelectItem>
          {columns.map((col) => (
            <SelectItem key={col} value={col}>
              {col}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : handleClose())}>
      <DialogContent data-tour="import-clients-modal" className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            استيراد العملاء من Excel
          </DialogTitle>
        </DialogHeader>

        {step === "method" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              ارفع ملف Excel أو CSV يحتوي أعمدة مثل: الاسم، الجوال، الهدف، السعر، وتاريخ نهاية الاشتراك. يمكنك إضافة
              أعمدة اختيارية (العمر، الوزن، نوع التدريب…) لمطابقة بياناتك القديمة من الجداول.
            </p>

            <Card
              className="p-4 cursor-pointer hover:shadow-md transition-shadow border-primary/20 hover:border-primary/40"
              onClick={() => !loading && fileRef.current?.click()}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <FileSpreadsheet className="w-5 h-5 text-primary" />}
                </div>
                <div>
                  <p className="font-bold text-card-foreground">رفع ملف Excel أو CSV</p>
                  <p className="text-xs text-muted-foreground">.xlsx / .xls / .csv — الورقة الأولى فقط</p>
                </div>
              </div>
            </Card>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls,.ods,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={handleFileUpload}
            />

            <Card className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-card-foreground">إدخال يدوي سريع</p>
                  <p className="text-xs text-muted-foreground">سطر لكل عميل: اسم، جوال، هدف، سعر</p>
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

            <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={downloadTemplate}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Download className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-card-foreground">تحميل نموذج Excel</p>
                  <p className="text-xs text-muted-foreground">ملف جاهز بالعربية مع صف مثال</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => setStep("method")}>
              <ArrowLeft className="w-4 h-4" /> رجوع
            </Button>

            <p className="text-sm text-muted-foreground">
              وُجد <strong>{rawData.length}</strong> صفاً و<strong>{columns.length}</strong> عموداً. اربط الأعمدة بالحقول
              (تم تخمين المطابقة تلقائياً حيث أمكن).
            </p>

            <div className="space-y-3 rounded-lg border border-border p-3 bg-card/40">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">الحقول الأساسية</p>
              {CORE_FIELDS.map(renderFieldSelect)}
            </div>

            <button
              type="button"
              className="flex w-full items-center justify-between text-sm font-medium text-primary py-1"
              onClick={() => setShowExtraMapping((v) => !v)}
            >
              حقول إضافية (عمر، وزن، نوع التدريب…)
              {showExtraMapping ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showExtraMapping && (
              <div className="space-y-3 rounded-lg border border-border p-3 bg-card/40 max-h-64 overflow-y-auto">
                {EXTRA_FIELDS.map(renderFieldSelect)}
              </div>
            )}

            {rawData.length > 0 && mapping.name && (
              <div className="rounded-lg bg-secondary p-3">
                <p className="text-xs font-bold text-muted-foreground mb-2">معاينة أول 3 صفوف:</p>
                {rawData.slice(0, 3).map((row, i) => (
                  <p key={i} className="text-xs text-secondary-foreground truncate">
                    {String(row[mapping.name!] ?? "")}{" "}
                    {mapping.phone ? `• ${String(row[mapping.phone] ?? "")}` : ""}
                  </p>
                ))}
              </div>
            )}

            <Button className="w-full" disabled={!mapping.name} onClick={applyMapping}>
              التالي: مراجعة واستيراد
            </Button>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => (rawData.length > 0 ? setStep("mapping") : setStep("method"))}
            >
              <ArrowLeft className="w-4 h-4" /> رجوع
            </Button>

            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-center space-y-1">
              <p className="text-sm font-medium">
                جاهز للاستيراد:{" "}
                <span className="text-primary font-bold">{willImport}</span> عميل
                {validRows.length !== willImport && (
                  <span className="text-muted-foreground text-xs block">
                    من أصل {validRows.length} صف صالح (حد الباقة أو الخطة)
                  </span>
                )}
              </p>
              {overCap && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  سيتم استيراد أول {willImport} عميل فقط حسب المساحة المتبقة في باقتك.
                </p>
              )}
              {mappedClients.filter((c) => !c.valid).length > 0 && (
                <p className="text-xs text-destructive">
                  {mappedClients.filter((c) => !c.valid).length} سطر مرفوض (اسم فارغ أو جوال مكرر)
                </p>
              )}
            </div>

            <div className="space-y-1 max-h-60 overflow-y-auto">
              {mappedClients.map((c, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                    c.valid ? "bg-secondary" : "bg-destructive/5 border border-destructive/20"
                  }`}
                >
                  {c.valid ? (
                    <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                  )}
                  <span className={`flex-1 truncate ${c.valid ? "text-secondary-foreground" : "text-destructive"}`}>
                    {c.name || "(بدون اسم)"} {c.phone && `• ${c.phone}`}
                    {!c.valid && c.error && ` — ${c.error}`}
                  </span>
                  {c.subscription_price > 0 && (
                    <span className="text-xs text-muted-foreground tabular-nums">{c.subscription_price} ر.س</span>
                  )}
                </div>
              ))}
            </div>

            <Button
              className="w-full"
              onClick={handleImport}
              disabled={loading || willImport === 0}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `استيراد ${willImport} عميل`}
            </Button>
          </div>
        )}

        {step === "done" && (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <p className="text-lg font-bold text-foreground">تم استيراد {importedCount} عميل</p>
            {(skippedCount > 0 || cappedCount > 0) && (
              <p className="text-sm text-muted-foreground">
                {skippedCount > 0 && <>تخطي {skippedCount} سطر (اسم فارغ أو جوال مكرر في الملف)</>}
                {skippedCount > 0 && cappedCount > 0 && <br />}
                {cappedCount > 0 && <>لم يُستورد {cappedCount} عميلاً إضافياً بسبب حد الباقة</>}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              البرامج والتمارين التفصيلية يمكن بناؤها لاحقاً من ملف كل عميل؛ تم نقل بيانات الملف الشخصي والاشتراك.
            </p>
            <Button className="w-full" onClick={handleClose}>
              إغلاق
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
