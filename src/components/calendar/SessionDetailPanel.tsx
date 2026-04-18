import { useState } from "react";
import {
  Session, Client, getSessionTypeStyle, formatTime, getEndTime,
} from "./calendar-utils";
import { Button } from "@/components/ui/button";
import {
  X, Edit2, MessageCircle, Trash2, CheckCircle2, UserCircle, Clock,
  CalendarDays, FileText, XCircle, Check, AlertCircle, HelpCircle,
} from "lucide-react";

interface Props {
  session: Session | null;
  clients: Client[];
  onClose: () => void;
  onEdit: (session: Session) => void;
  onDelete: (id: string) => void;
  onWhatsApp: (session: Session) => void;
  onComplete?: (session: Session) => void;
  deleting: boolean;
}

const confirmationLabels: Record<string, { label: string; color: string; icon: any }> = {
  confirmed: { label: "مؤكد", color: "text-primary bg-primary/15 border-primary/20", icon: CheckCircle2 },
  declined: { label: "رفض", color: "text-red-400 bg-red-500/10 border-red-500/20", icon: XCircle },
  pending: { label: "بدون رد", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", icon: HelpCircle },
};

export default function SessionDetailPanel({
  session, clients, onClose, onEdit, onDelete, onWhatsApp, onComplete, deleting,
}: Props) {
  if (!session) return null;

  const client = clients.find((c) => c.id === session.client_id);
  const typeStyle = getSessionTypeStyle(session.session_type);
  const confirmation = confirmationLabels[(session as any).confirmation_status || "pending"];
  const isCompleted = (session as any).is_completed === true;
  const ConfIcon = confirmation.icon;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />

      {/* Panel */}
      <div
        className="fixed top-0 left-0 h-full w-[400px] max-w-[90vw] bg-card border-r border-border z-50 animate-slide-in-right"
        dir="rtl"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">تفاصيل الجلسة</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Completion badge */}
            {isCompleted && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/15 border border-primary/20">
                <CheckCircle2 className="w-4 h-4 text-primary" strokeWidth={1.5} />
                <span className="text-sm font-medium text-primary">تم إكمال الجلسة</span>
              </div>
            )}

            {/* Client card */}
            <div
              className="p-4 rounded-xl border"
              style={{ backgroundColor: typeStyle.bg, borderColor: `${typeStyle.color}30` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: `${typeStyle.color}20`, color: typeStyle.text }}
                >
                  {client?.name.charAt(0) || "؟"}
                </div>
                <div>
                  <p className="font-bold text-foreground">{client?.name || "عميل غير معروف"}</p>
                  <p className="text-xs mt-0.5" style={{ color: typeStyle.text }}>
                    {session.session_type}
                  </p>
                </div>
              </div>
            </div>

            {/* Confirmation status */}
            <div className={`flex items-center gap-2 p-3 rounded-xl border ${confirmation.color}`}>
              <ConfIcon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              <div>
                <p className="text-xs opacity-70">حالة التأكيد</p>
                <p className="text-sm font-medium">{confirmation.label}</p>
              </div>
            </div>

            {/* Details grid */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border">
                <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                <div>
                  <p className="text-xs text-muted-foreground">التاريخ</p>
                  <p className="text-sm font-medium text-foreground">{session.session_date}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border">
                <Clock className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                <div>
                  <p className="text-xs text-muted-foreground">الوقت والمدة</p>
                  <p className="text-sm font-medium text-foreground tabular-nums">
                    {formatTime(session.start_time)} — {formatTime(getEndTime(session.start_time, session.duration_minutes))}
                    <span className="text-muted-foreground mr-2">({session.duration_minutes} دقيقة)</span>
                  </p>
                </div>
              </div>
              {session.notes && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 border border-border">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <p className="text-xs text-muted-foreground">ملاحظات</p>
                    <p className="text-sm text-foreground mt-0.5">{session.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="p-5 border-t border-border space-y-2">
            {/* Mark as completed */}
            {!isCompleted && onComplete && (
              <Button
                className="w-full gap-1.5 bg-primary hover:bg-primary-hover text-white"
                size="sm"
                onClick={() => onComplete(session)}
              >
                <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
                تم إكمال الجلسة
              </Button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-border hover:border-primary/40 hover:bg-primary/5"
                onClick={() => onEdit(session)}
              >
                <Edit2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                تعديل
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-border hover:border-primary/40 text-primary hover:bg-primary/5"
                onClick={() => onWhatsApp(session)}
              >
                <MessageCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
                تذكير واتساب
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
              disabled={deleting}
              onClick={() => onDelete(session.id)}
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
              حذف الجلسة
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
