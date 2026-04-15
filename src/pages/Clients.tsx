import { useMemo, useState } from "react";
import FeatureTooltip from "@/components/FeatureTooltip";
import usePageTitle from "@/hooks/usePageTitle";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import UpgradeModal from "@/components/UpgradeModal";
import TrialBanner from "@/components/TrialBanner";
import { ClientCardSkeleton } from "@/components/skeletons/ClientCardSkeleton";
import {
  Plus, Search, Target, Loader2, ChevronDown, ChevronUp, Users,
  UserPlus, MoreVertical, Phone, CalendarDays, MessageCircle, Eye, ClipboardList, Filter, Trash2,
  FileSpreadsheet,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { deleteTrainerClient } from "@/lib/deleteTrainerClient";
import ImportClientsModal from "@/components/ImportClientsModal";
import { isValidSignupEmail } from "@/lib/email-validation";
import { getAuthSiteOrigin } from "@/lib/auth-constants";
import { parseClientTrainingType, TRAINING_TYPE_LABEL_AR, type ClientTrainingType } from "@/lib/training-type";
import { isUndefinedColumnError } from "@/lib/postgrestErrors";
import { parseSendInviteEmailInvoke } from "@/lib/sendInviteEmailResult";

type FilterStatus = "all" | "active" | "overdue" | "no_program";

type ClientListRow = {
  id: string;
  name: string;
  goal: string | null;
  subscription_end_date: string;
  week_number: number;
  program_id: string | null;
  phone: string | null;
  client_type?: string | null;
  sessions_per_month?: number | null;
  sessions_used?: number | null;
  last_active_at?: string | null;
  training_type?: string;
};

function getPaymentStatus(subscriptionEndDate: string): "active" | "overdue" | "expiring" {
  const end = new Date(subscriptionEndDate);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "overdue";
  if (diff <= 7) return "expiring";
  return "active";
}

const statusAccentColors = {
  active: "border-r-[3px] border-r-emerald-500",
  overdue: "border-r-[3px] border-r-red-500",
  expiring: "border-r-[3px] border-r-amber-500",
};
const statusLabels = { active: "نشط", overdue: "منتهي", expiring: "ينتهي قريبا" };
const statusBadgeColors = {
  active: "bg-emerald-500/10 text-emerald-400",
  overdue: "bg-red-500/10 text-red-400",
  expiring: "bg-amber-500/10 text-amber-400",
};

const AVATAR_COLORS = [
  "bg-emerald-600", "bg-blue-600", "bg-purple-600", "bg-orange-600",
  "bg-pink-600", "bg-teal-600", "bg-indigo-600", "bg-cyan-600",
];

const PhoneRevealButton = ({ phone }: { phone: string }) => {
  const [revealed, setRevealed] = useState(false);
  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRevealed(!revealed); }}
      className="flex items-center gap-0.5 hover:text-primary transition-colors"
    >
      <Phone className="w-3 h-3" strokeWidth={1.5} />
      {revealed ? <span dir="ltr">{phone}</span> : <span className="text-[10px]">إظهار الرقم</span>}
    </button>
  );
};

const Clients = () => {
  usePageTitle("العملاء");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [open, setOpen] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", goal: "", price: "", startDate: "", email: "", age: "", weight: "", height: "", experience: "مبتدئ", daysPerWeek: "4", injuries: "", equipment: "", clientType: "online", sessionsPerMonth: "0" });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { getAddClientBlockReason, clientCount, maxClients } = usePlanLimits();
  const importSlotsRemaining =
    maxClients === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : Math.max(0, maxClients - clientCount);
  const [blockReason, setBlockReason] = useState<{ title: string; description: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClientListRow | null>(null);
  const [showImport, setShowImport] = useState(false);

  const emailValid = useMemo(() => isValidSignupEmail(form.email), [form.email]);

  const handleAddClick = () => {
    const reason = getAddClientBlockReason();
    if (reason?.blocked) {
      setBlockReason(reason);
      setShowUpgrade(true);
    } else {
      setOpen(true);
    }
  };

  const handleImportClick = () => {
    const reason = getAddClientBlockReason();
    if (reason?.blocked) {
      setBlockReason(reason);
      setShowUpgrade(true);
    } else {
      setShowImport(true);
    }
  };

  const clientsQueryKey = ["clients", user?.id] as const;

  const { data: clients = [], isLoading } = useQuery({
    queryKey: clientsQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClientListRow[];
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (clientId: string) => {
      await deleteTrainerClient(clientId);
    },
    onMutate: async (clientId: string) => {
      await queryClient.cancelQueries({ queryKey: clientsQueryKey });
      const previous = queryClient.getQueryData<ClientListRow[]>(clientsQueryKey);
      queryClient.setQueryData<ClientListRow[]>(clientsQueryKey, (old) => (old ?? []).filter((c) => c.id !== clientId));
      return { previous };
    },
    onError: (err: Error, _clientId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(clientsQueryKey, context.previous);
      }
      toast({
        title: "تعذّر الحذف",
        description: err.message,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({ title: "تم حذف العميل بنجاح" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: clientsQueryKey });
      queryClient.invalidateQueries({ queryKey: ["copilot-trainer-clients"] });
    },
  });

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    deleteMutation.mutate(id);
  };

  const { data: profile } = useQuery({
    queryKey: ["trainer-profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const emailTrim = form.email.trim();
      if (!isValidSignupEmail(emailTrim)) {
        throw new Error("البريد الإلكتروني غير صالح");
      }
      const startDate = form.startDate ? new Date(form.startDate) : new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 30);
      const insertPayload: Record<string, unknown> = {
        trainer_id: user!.id,
        name: form.name,
        phone: form.phone,
        goal: form.goal,
        email: emailTrim,
        subscription_price: Number(form.price) || 0,
        subscription_end_date: endDate.toISOString().split("T")[0],
        last_workout_date: new Date().toISOString().split("T")[0],
        age: form.age ? parseInt(form.age) : null,
        weight: form.weight ? parseFloat(form.weight) : null,
        height: form.height ? parseFloat(form.height) : null,
        experience: form.experience || "مبتدئ",
        days_per_week: parseInt(form.daysPerWeek) || 4,
        injuries: form.injuries || null,
        preferred_equipment: form.equipment || null,
        client_type: form.clientType,
        training_type: (form.clientType === "in_person" ? "in_person" : "online") as ClientTrainingType,
        sessions_per_month: form.clientType === "in_person" ? (parseInt(form.sessionsPerMonth) || 0) : 0,
      };

      let { data: newClient, error } = await supabase
        .from("clients")
        .insert(insertPayload as any)
        .select("id, invite_token")
        .single();

      if (error && isUndefinedColumnError(error, "training_type")) {
        const { training_type: _tt, trainer_type: _tr, ...withoutTrainingType } = insertPayload as Record<
          string,
          unknown
        >;
        const retry = await supabase
          .from("clients")
          .insert(withoutTrainingType as any)
          .select("id, invite_token")
          .single();
        newClient = retry.data;
        error = retry.error;
      }
      if (error) throw error;
      if (newClient?.invite_token) {
        try {
          const { data: emailResult, error: fnError } = await supabase.functions.invoke("send-invite-email", {
            body: {
              clientName: form.name,
              clientEmail: emailTrim,
              trainerName: profile?.full_name || "مدربك",
              inviteToken: newClient.invite_token,
              siteOrigin: getAuthSiteOrigin(),
            },
          });
          const { payload, invokeError } = await parseSendInviteEmailInvoke(emailResult, fnError);
          if (fnError && !payload) {
            console.error("[send-invite-email] Edge function invoke failed:", fnError);
          }
          if (payload != null) {
            console.log("[send-invite-email] response:", JSON.stringify(payload));
          }

          if (!payload && invokeError) {
            toast({
              title: "تمت إضافة العميل",
              description: `تعذّر قراءة رد دالة الإيميل: ${invokeError}. أعد نشر send-invite-email من مجلد supabase/functions.`,
              variant: "destructive",
              duration: 16_000,
            });
          } else if (payload?.code === "unauthorized") {
            toast({
              title: "انتهت الجلسة",
              description: payload.error ?? "أعد تسجيل الدخول ثم أعد إرسال الدعوة من ملف العميل.",
              variant: "destructive",
              duration: 14_000,
            });
          } else if (payload?.code === "forbidden") {
            toast({
              title: "تعذّر التحقق من الدعوة",
              description: payload.error ?? "افتح ملف العميل وأعد إرسال الدعوة.",
              variant: "destructive",
              duration: 16_000,
            });
          } else if (payload?.code === "bad_request" || payload?.code === "server_error") {
            toast({
              title: "تعذّر إرسال الإيميل",
              description: payload.error ?? invokeError ?? "تحقق من أسرار الدالة في Supabase.",
              variant: "destructive",
              duration: 16_000,
            });
          } else if (payload?.success === false) {
            toast({
              title: "فشل إرسال الإيميل (Resend)",
              description: [payload.message, payload.error, payload.setupLink ? `رابط التسجيل: ${payload.setupLink}` : null]
                .filter(Boolean)
                .join(" — "),
              variant: "destructive",
              duration: 22_000,
            });
          } else if (payload?.emailSent) {
            toast({ title: "تم إرسال الدعوة بالإيميل", description: `تم إرسال رابط التسجيل إلى ${emailTrim}` });
          } else if (payload?.setupLink) {
            const why =
              payload.reason === "missing_resend_api_key"
                ? " (لم يُضبط مفتاح Resend في أسرار الدوال — أضف RESEND_API_KEY وأعد النشر)"
                : payload.reason === "missing_invite_token"
                  ? " (لا يوجد invite_token — تحقق من trigger قاعدة البيانات)"
                  : "";
            toast({
              title: "تمت إضافة العميل — لم يُرسل الإيميل تلقائياً",
              description: `${payload.message ?? "شارك الرابط يدوياً"}${why} — الرابط: ${payload.setupLink}`,
              duration: 22_000,
            });
          }
        } catch (e) {
          console.error("[send-invite-email] Email send error:", e);
          toast({ title: "تمت إضافة العميل", description: "لم يتم إرسال الإيميل، شارك الرابط يدوياً من ملف العميل" });
        }
      } else {
        console.warn("[Clients] New client missing invite_token — trigger generate_invite_token may not have run; email was:", emailTrim);
      }
      if (newClient?.id && form.goal && (form.weight || form.height)) {
        try {
          await supabase.functions.invoke("copilot-generate", { body: { client_id: newClient.id, action: "generate_program" } });
          toast({ title: "تم إنشاء برنامج AI تلقائيا", description: "افتح ملف العميل لمراجعة البرنامج المقترح" });
        } catch (e) { console.error("Auto copilot error:", e); }
      }
      return newClient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientsQueryKey });
      setOpen(false);
      setForm({ name: "", phone: "", goal: "", price: "", startDate: "", email: "", age: "", weight: "", height: "", experience: "مبتدئ", daysPerWeek: "4", injuries: "", equipment: "", clientType: "online", sessionsPerMonth: "0" });
      setShowAdvanced(false);
    },
    onError: (err: Error) => {
      toast({
        title: "تعذّر إضافة العميل",
        description: err?.message || "تحقق من الاتصال أو صلاحيات قاعدة البيانات.",
        variant: "destructive",
      });
    },
  });

  const activeCount = clients.filter(c => getPaymentStatus(c.subscription_end_date) !== "overdue").length;

  const filtered = (clients ?? []).filter((c) => {
    const matchesSearch = (c.name ?? "").includes(search) || (c.goal ?? "").includes(search);
    if (!matchesSearch) return false;
    if (filter === "all") return true;
    if (filter === "active") return getPaymentStatus(c.subscription_end_date) === "active";
    if (filter === "overdue") return getPaymentStatus(c.subscription_end_date) === "overdue";
    if (filter === "no_program") return !c.program_id;
    return true;
  });

  const filterChips: { key: FilterStatus; label: string }[] = [
    { key: "all", label: "الكل" },
    { key: "active", label: "نشط" },
    { key: "overdue", label: "منتهي" },
    { key: "no_program", label: "بدون برنامج" },
  ];

  return (
    <div className="space-y-5 page-enter">
        <FeatureTooltip id="clients-add" targetSelector="[data-tour='add-client']" message="ابدأ بإضافة عملاءك هنا" />
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">العملاء</h1>
            <p className="text-sm text-muted-foreground">{activeCount} عميل نشط</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleImportClick} className="gap-1.5" size="sm">
              <FileSpreadsheet className="w-4 h-4" strokeWidth={1.5} />
              استيراد Excel
            </Button>
            <Button onClick={handleAddClick} className="gap-1.5" size="sm">
              <UserPlus className="w-4 h-4" strokeWidth={1.5} />
              إضافة عميل
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
          <Input
            data-tour="search"
            placeholder="ابحث عن عميل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10 bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)] focus-visible:border-primary/60"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2">
          {filterChips.map(chip => (
            <button
              key={chip.key}
              onClick={() => setFilter(chip.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                filter === chip.key
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "border-[hsl(0_0%_10%)] text-muted-foreground hover:border-primary/20 hover:text-foreground"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 pb-20 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <ClientCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            {search || filter !== "all" ? (
              <p className="text-muted-foreground">لا توجد نتائج</p>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-[hsl(0_0%_6%)] border border-[hsl(0_0%_10%)] flex items-center justify-center mx-auto">
                  <UserPlus className="w-8 h-8 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-bold text-foreground">لم تضف عملاء بعد</h3>
                <p className="text-sm text-muted-foreground">أضف عميلاً واحداً أو استورد قائمة من Excel</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="outline" className="gap-1" onClick={handleImportClick}>
                    <FileSpreadsheet className="w-4 h-4" /> استيراد من Excel
                  </Button>
                  <Button className="gap-1" onClick={handleAddClick}>
                    <Plus className="w-4 h-4" /> إضافة عميل
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-20">
            {filtered.map((client, idx) => {
              const status = getPaymentStatus(client.subscription_end_date);
              const initials = client.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2);
              const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
              const lastActive = (client as any).last_active_at ? new Date((client as any).last_active_at) : null;
              const minsAgo = lastActive ? Math.floor((Date.now() - lastActive.getTime()) / 60000) : null;
              let activityText = "";
              if (minsAgo !== null) {
                if (minsAgo < 120) activityText = "نشط الآن";
                else if (minsAgo < 1440) activityText = "اليوم";
                else activityText = `منذ ${Math.floor(minsAgo / 1440)} أيام`;
              }
              const totalWeeks = 12;
              const progressPct = Math.min((client.week_number / totalWeeks) * 100, 100);

              return (
                <Card
                  key={client.id}
                  className={`p-4 bg-[hsl(0_0%_6%)] border-[hsl(0_0%_10%)] rounded-xl ${statusAccentColors[status]} hover:border-primary/40 transition-all duration-200 hover:-translate-y-0.5 group`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-sm font-bold text-white">{initials}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <Link to={`/clients/${client.id}`} className="font-bold text-foreground hover:text-primary transition-colors truncate">
                          {client.name}
                        </Link>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusBadgeColors[status]}`}>
                          {statusLabels[status]}
                        </span>
                      </div>

                      {/* Goal & type badges */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {client.goal}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          parseClientTrainingType(client.training_type) === "in_person"
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                        }`}>
                          {TRAINING_TYPE_LABEL_AR[parseClientTrainingType(client.training_type)]}
                        </span>
                        {(client as any).client_type === "in_person" && (client as any).sessions_per_month > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {(client as any).sessions_used || 0}/{(client as any).sessions_per_month} جلسة
                          </span>
                        )}
                        {activityText && (
                          <span className="text-[10px] text-muted-foreground">{activityText}</span>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
                          <span>أسبوع {client.week_number} من {totalWeeks}</span>
                          <span>{Math.round(progressPct)}%</span>
                        </div>
                        <div className="w-full h-1 rounded-full bg-[hsl(0_0%_10%)]">
                          <div className="h-1 rounded-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
                        </div>
                      </div>

                      {/* Bottom actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          {client.phone && (
                            <PhoneRevealButton phone={client.phone} />
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {client.phone && (
                              <a href={`https://wa.me/966${client.phone.replace(/^0/, "")}`} target="_blank" rel="noopener noreferrer"
                                className="p-1.5 rounded-md hover:bg-[hsl(0_0%_10%)] text-muted-foreground hover:text-primary transition-colors">
                                <MessageCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
                              </a>
                            )}
                            <Link to={`/clients/${client.id}`}
                              className="p-1.5 rounded-md hover:bg-[hsl(0_0%_10%)] text-muted-foreground hover:text-primary transition-colors">
                              <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
                            </Link>
                          </div>
                          <button
                            type="button"
                            aria-label="حذف العميل"
                            disabled={deleteMutation.isPending}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDeleteTarget(client);
                            }}
                            className="p-1.5 rounded-md hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent className="border-[hsl(0_0%_10%)] bg-[hsl(0_0%_6%)] text-right" dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                هل أنت متأكد من حذف هذا العميل؟ لا يمكن التراجع عن هذا الإجراء
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:justify-start">
              <AlertDialogCancel className="border-[hsl(0_0%_10%)] bg-[hsl(0_0%_8%)]">إلغاء</AlertDialogCancel>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => confirmDelete()}
              >
                حذف
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* FAB */}
        <button
          type="button"
          onClick={handleAddClick}
          data-tour="add-client"
          aria-label="إضافة عميل جديد"
          title="إضافة عميل جديد"
          className="fixed bottom-20 left-4 z-50 flex h-14 w-14 items-center justify-center rounded-full btn-gradient text-primary-foreground fab-premium"
        >
          <Plus className="w-6 h-6" />
        </button>

        <UpgradeModal
          open={showUpgrade}
          onOpenChange={setShowUpgrade}
          title={blockReason?.title || ""}
          description={blockReason?.description || ""}
          onUpgrade={() => { setShowUpgrade(false); setShowPlans(true); }}
        />

        <ImportClientsModal
          open={showImport}
          onOpenChange={setShowImport}
          slotsRemaining={importSlotsRemaining}
        />

        {/* Add Client Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            dir="rtl"
            className="flex min-h-0 max-h-[90vh] w-full max-w-lg flex-col gap-0 overflow-hidden border-[hsl(0_0%_10%)] bg-[hsl(0_0%_6%)] p-0"
          >
            <DialogHeader className="shrink-0 space-y-1.5 px-6 pb-2 pt-6 pr-14 text-right">
              <DialogTitle>إضافة عميل جديد</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addMutation.mutate();
              }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-6 pb-2">
              <div>
                <label className="text-sm font-medium text-foreground">الاسم</label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اسم العميل" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">رقم الجوال</label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="05XXXXXXXX" type="tel" dir="ltr" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">الهدف</label>
                <Input required value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} placeholder="مثال: خسارة وزن" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">نوع التدريب</label>
                <Select value={form.clientType} onValueChange={(v) => setForm({ ...form, clientType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">أونلاين</SelectItem>
                    <SelectItem value="in_person">حضوري</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.clientType === "in_person" && (
                <div>
                  <label className="text-sm font-medium text-foreground">عدد الجلسات / الشهر</label>
                  <Input value={form.sessionsPerMonth} onChange={(e) => setForm({ ...form, sessionsPerMonth: e.target.value })} type="number" dir="ltr" placeholder="12" />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-foreground">سعر الاشتراك (ر.س)</label>
                <Input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} type="number" dir="ltr" placeholder="800" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  البريد الإلكتروني <span className="text-destructive" aria-hidden="true">*</span>
                </label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  dir="ltr"
                  placeholder="client@email.com"
                  aria-invalid={form.email.length > 0 && !emailValid}
                  className={form.email.length > 0 && !emailValid ? "border-destructive/60" : undefined}
                />
                <p className="text-xs text-muted-foreground mt-1">يُستخدم لإرسال رابط إنشاء الحساب وربط المتدرب بالمنصة</p>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">تاريخ البدء</label>
                <Input value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} type="date" dir="ltr" />
              </div>

              <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-1 text-sm text-primary font-medium w-full justify-center py-1">
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                بيانات متقدمة (لتوليد برنامج AI تلقائي)
              </button>

              {showAdvanced && (
                <div className="space-y-3 border border-primary/20 rounded-lg p-3 bg-primary/5">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs font-medium text-foreground">العمر</label>
                      <Input value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} type="number" placeholder="25" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground">الوزن (كجم)</label>
                      <Input value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} type="number" placeholder="80" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground">الطول (سم)</label>
                      <Input value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} type="number" placeholder="175" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-foreground">الخبرة</label>
                      <Select value={form.experience} onValueChange={(v) => setForm({ ...form, experience: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="مبتدئ">مبتدئ</SelectItem>
                          <SelectItem value="متوسط">متوسط</SelectItem>
                          <SelectItem value="متقدم">متقدم</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground">أيام التدريب / أسبوع</label>
                      <Select value={form.daysPerWeek} onValueChange={(v) => setForm({ ...form, daysPerWeek: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[2,3,4,5,6].map(n => <SelectItem key={n} value={String(n)}>{n} أيام</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground">إصابات أو قيود (اختياري)</label>
                    <Input value={form.injuries} onChange={(e) => setForm({ ...form, injuries: e.target.value })} placeholder="مثال: مشكلة في الركبة" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground">الأدوات المتوفرة (اختياري)</label>
                    <Input value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value })} placeholder="مثال: دمبلز، بار، أجهزة نادي" />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">تعبئة هذه البيانات تمكن المساعد الذكي من إنشاء برنامج تدريب وتغذية مخصص تلقائيا</p>
                </div>
              )}
              </div>

              <div className="shrink-0 border-t border-[hsl(0_0%_10%)] bg-[hsl(0_0%_6%)] px-6 py-4">
                <Button type="submit" className="w-full" disabled={addMutation.isPending || !emailValid}>
                  {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {showPlans && <TrialBannerPlans open={showPlans} onOpenChange={setShowPlans} />}
      </div>
  );
};

const TrialBannerPlans = ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => (
  <TrialBanner showPlans={open} onShowPlansChange={onOpenChange} />
);

export default Clients;
