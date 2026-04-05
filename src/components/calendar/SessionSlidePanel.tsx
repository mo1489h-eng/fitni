import { useState, useMemo, useEffect } from "react";
import {
  Session, Client, SESSION_TYPES, DURATIONS, LOCATIONS,
  getSessionTypeStyle, formatTime, hasConflict,
} from "./calendar-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  X, Loader2, AlertTriangle, User, CalendarDays, Clock,
  MapPin, FileText, Dumbbell,
} from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  clients: Client[];
  sessions: Session[];
  editSession?: Session | null;
  prefillDate?: string;
  prefillTime?: string;
  onSave: (data: {
    client_id: string;
    session_type: string;
    session_date: string;
    start_time: string;
    duration_minutes: number;
    notes: string | null;
  }) => Promise<void>;
  saving: boolean;
}

export default function SessionSlidePanel({
  open, onClose, clients, sessions, editSession, prefillDate, prefillTime, onSave, saving,
}: Props) {
  const [clientId, setClientId] = useState("");
  const [type, setType] = useState("تدريب شخصي");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState("60");
  const [notes, setNotes] = useState("");
  const [clientSearch, setClientSearch] = useState("");

  useEffect(() => {
    if (open) {
      if (editSession) {
        setClientId(editSession.client_id);
        setType(editSession.session_type);
        setDate(editSession.session_date);
        setTime(editSession.start_time.slice(0, 5));
        setDuration(String(editSession.duration_minutes));
        setNotes(editSession.notes || "");
      } else {
        setClientId("");
        setType("تدريب شخصي");
        setDate(prefillDate || "");
        setTime(prefillTime || "09:00");
        setDuration("60");
        setNotes("");
      }
      setClientSearch("");
    }
  }, [open, editSession, prefillDate, prefillTime]);

  const conflict = useMemo(
    () => date && time ? hasConflict(sessions, date, time, Number(duration), editSession?.id) : null,
    [sessions, date, time, duration, editSession],
  );

  const filteredClients = useMemo(
    () => clientSearch
      ? clients.filter((c) => c.name.includes(clientSearch))
      : clients,
    [clients, clientSearch],
  );

  const selectedClientName = clients.find((c) => c.id === clientId)?.name;

  const handleSubmit = () => {
    onSave({
      client_id: clientId,
      session_type: type,
      session_date: date,
      start_time: time,
      duration_minutes: Number(duration),
      notes: notes || null,
    });
  };

  return (
    <>
      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      )}

      {/* Panel */}
      <div
        className={`
          fixed top-0 left-0 h-full w-[400px] max-w-[90vw] bg-card border-r border-border z-50
          transition-transform duration-300 ease-out
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex flex-col h-full" dir="rtl">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" strokeWidth={1.5} />
              {editSession ? "تعديل الجلسة" : "إضافة جلسة جديدة"}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>

          {/* Form */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Client selector */}
            <div>
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5 mb-2">
                <User className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
                العميل
              </label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="اختر العميل" />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <Input
                      placeholder="ابحث عن عميل..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="h-8 text-sm bg-card border-border"
                    />
                  </div>
                  {filteredClients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                          {c.name.charAt(0)}
                        </span>
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Session type */}
            <div>
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5 mb-2">
                <Dumbbell className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
                نوع الجلسة
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SESSION_TYPES.filter(t => t.value !== "استراحة").map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setType(t.value)}
                    className={`
                      text-sm py-2.5 px-3 rounded-lg border transition-all duration-150 text-right
                      ${type === t.value
                        ? "border-primary/50 ring-1 ring-primary/20"
                        : "border-border hover:border-border/80"
                      }
                    `}
                    style={type === t.value ? { backgroundColor: t.bg, color: t.text } : {}}
                  >
                    {t.value}
                  </button>
                ))}
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5 mb-2">
                  <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
                  التاريخ
                </label>
                <Input
                  type="date"
                  dir="ltr"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-background border-border"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5 mb-2">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
                  الوقت
                </label>
                <Input
                  type="time"
                  dir="ltr"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="bg-background border-border"
                />
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5 mb-2">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
                المدة
              </label>
              <div className="flex gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDuration(String(d.value))}
                    className={`
                      flex-1 text-sm py-2 rounded-lg border transition-all duration-150
                      ${duration === String(d.value)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-border/80"
                      }
                    `}
                  >
                    {d.value}م
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5 mb-2">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
                ملاحظات
              </label>
              <Textarea
                placeholder="ملاحظات اختيارية..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="bg-background border-border resize-none"
              />
            </div>

            {/* Conflict warning */}
            {conflict && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-warning/10 border border-warning/20">
                <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" strokeWidth={1.5} />
                <div>
                  <p className="text-sm font-medium text-warning">تعارض في الوقت</p>
                  <p className="text-xs text-warning/70 mt-0.5">
                    تعارض مع جلسة في نفس الوقت
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-border space-y-3">
            <Button
              className="w-full gap-2"
              disabled={!clientId || !date || saving || !!conflict}
              onClick={handleSubmit}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CalendarDays className="w-4 h-4" strokeWidth={1.5} />
              )}
              {editSession ? "تحديث الجلسة" : "حفظ الجلسة"}
            </Button>
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={onClose}>
              إلغاء
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
