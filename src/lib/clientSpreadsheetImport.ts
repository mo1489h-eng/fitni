import type { Database } from "@/integrations/supabase/types";

export type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];

export type ImportFieldKey =
  | "name"
  | "phone"
  | "email"
  | "goal"
  | "subscription_price"
  | "subscription_end_date"
  | "age"
  | "weight"
  | "height"
  | "experience"
  | "days_per_week"
  | "injuries"
  | "preferred_equipment"
  | "client_type"
  | "sessions_per_month"
  | "week_number";

export const IMPORT_FIELD_DEFS: {
  key: ImportFieldKey;
  label: string;
  required: boolean;
  group: "core" | "extra";
}[] = [
  { key: "name", label: "الاسم الكامل", required: true, group: "core" },
  { key: "phone", label: "رقم الجوال", required: false, group: "core" },
  { key: "email", label: "البريد الإلكتروني", required: false, group: "core" },
  { key: "goal", label: "الهدف التدريبي", required: false, group: "core" },
  { key: "subscription_price", label: "سعر الاشتراك (ر.س)", required: false, group: "core" },
  { key: "subscription_end_date", label: "تاريخ نهاية الاشتراك", required: false, group: "core" },
  { key: "age", label: "العمر", required: false, group: "extra" },
  { key: "weight", label: "الوزن (كجم)", required: false, group: "extra" },
  { key: "height", label: "الطول (سم)", required: false, group: "extra" },
  { key: "experience", label: "الخبرة (مبتدئ / متوسط / متقدم)", required: false, group: "extra" },
  { key: "days_per_week", label: "أيام التمرين بالأسبوع", required: false, group: "extra" },
  { key: "injuries", label: "إصابات أو ملاحظات صحية", required: false, group: "extra" },
  { key: "preferred_equipment", label: "المعدات المتاحة", required: false, group: "extra" },
  { key: "client_type", label: "نوع التدريب (أونلاين / حضوري)", required: false, group: "extra" },
  { key: "sessions_per_month", label: "جلسات حضوري شهرياً", required: false, group: "extra" },
  { key: "week_number", label: "رقم الأسبوع الحالي في البرنامج", required: false, group: "extra" },
];

/** Match Excel / Google Sheets column header to our field keys (Arabic + English). */
const HEADER_HINTS: Record<ImportFieldKey, string[]> = {
  name: ["name", "الاسم", "full", "client", "العميل"],
  phone: ["phone", "mobile", "جوال", "هاتف", "tel"],
  email: ["email", "mail", "بريد", "الإيميل"],
  goal: ["goal", "هدف", "objective"],
  subscription_price: ["price", "سعر", "amount", "مبلغ", "اشتراك"],
  subscription_end_date: ["end", "expiry", "انتهاء", "نهاية", "تاريخ"],
  age: ["age", "عمر", "العمر"],
  weight: ["weight", "وزن", "الوزن", "kg"],
  height: ["height", "طول", "الطول", "cm"],
  experience: ["experience", "خبرة", "مستوى", "level"],
  days_per_week: ["days", "أيام", "week", "أسبوع"],
  injuries: ["injur", "إصابة", "ملاحظات", "notes", "health"],
  preferred_equipment: ["equip", "معدات", "أجهزة"],
  client_type: ["type", "نوع", "online", "حضور", "in_person"],
  sessions_per_month: ["session", "جلسات", "شهري"],
  week_number: ["week", "أسبوع", "الأسبوع"],
};

export function guessColumnMapping(columnNames: string[]): Partial<Record<ImportFieldKey, string>> {
  const norm = (s: string) => s.replace(/^\uFEFF/, "").trim().toLowerCase();
  const out: Partial<Record<ImportFieldKey, string>> = {};
  const used = new Set<string>();

  const tryField = (key: ImportFieldKey) => {
    const hints = HEADER_HINTS[key];
    for (const col of columnNames) {
      if (used.has(col)) continue;
      const n = norm(col);
      if (!n) continue;
      if (hints.some((h) => n.includes(h.toLowerCase()))) {
        out[key] = col;
        used.add(col);
        return;
      }
    }
  };

  (["name", "phone", "email", "goal", "subscription_price", "subscription_end_date"] as const).forEach(tryField);
  (["age", "weight", "height", "experience", "days_per_week", "injuries", "preferred_equipment", "client_type", "sessions_per_month", "week_number"] as const).forEach(tryField);

  // Strong fallback: first column → name if nothing matched
  if (!out.name && columnNames[0]) {
    out.name = columnNames[0];
    used.add(columnNames[0]);
  }

  return out;
}

export function parseExcelSerialDate(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number" && !Number.isNaN(raw)) {
    const utc = (raw - 25569) * 86400 * 1000;
    const d = new Date(utc);
    if (!Number.isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }
  const s = String(raw).trim();
  if (!s) return null;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().split("T")[0];
  const parts = s.split(/[./-]/);
  if (parts.length === 3) {
    const [a, b, c] = parts.map((p) => parseInt(p, 10));
    if (!Number.isNaN(a) && !Number.isNaN(b) && !Number.isNaN(c)) {
      let y: number;
      let m: number;
      let day: number;
      if (a > 31) {
        y = a;
        m = b;
        day = c;
      } else {
        day = a;
        m = b;
        y = c;
      }
      if (y < 100) y += 2000;
      const dt = new Date(Date.UTC(y, m - 1, day));
      if (!Number.isNaN(dt.getTime())) return dt.toISOString().split("T")[0];
    }
  }
  return null;
}

export function normalizePhone(raw: string): string {
  return raw.replace(/\s+/g, "").replace(/^\+966/, "0").replace(/^966/, "0");
}

export function parseClientType(raw: string): "online" | "in_person" {
  const s = raw.trim().toLowerCase();
  if (!s) return "online";
  if (["حضوري", "in_person", "in person", "1", "presence", "offline", "gym"].includes(s)) return "in_person";
  if (s.includes("حضور") || s.includes("gym")) return "in_person";
  return "online";
}

export function parseExperience(raw: string): string {
  const s = raw.trim();
  if (!s) return "مبتدئ";
  if (/متقدم|advanced/i.test(s)) return "متقدم";
  if (/متوسط|intermediate/i.test(s)) return "متوسط";
  return "مبتدئ";
}

export function parseOptionalNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number" && !Number.isNaN(raw)) return raw;
  const n = parseFloat(String(raw).replace(/,/g, ".").replace(/[^\d.-]/g, ""));
  return Number.isNaN(n) ? null : n;
}

export function parseOptionalInt(raw: unknown, fallback: number): number {
  const n = parseOptionalNumber(raw);
  if (n === null) return fallback;
  return Math.round(n);
}

export async function parseSpreadsheetToRows(file: File): Promise<Record<string, unknown>[]> {
  const XLSX = await import("xlsx");
  const name = file.name.toLowerCase();
  let sheet: XLSX.WorkSheet;

  if (name.endsWith(".csv")) {
    const text = (await file.text()).replace(/^\uFEFF/, "");
    const wb = XLSX.read(text, { type: "string" });
    const sn = wb.SheetNames[0];
    if (!sn) return [];
    sheet = wb.Sheets[sn];
  } else {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sn = wb.SheetNames[0];
    if (!sn) return [];
    sheet = wb.Sheets[sn];
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: true,
  });
  return rows;
}

export interface MappedImportRow {
  name: string;
  phone: string;
  email: string | null;
  goal: string;
  subscription_price: number;
  subscription_end_date: string;
  age: number | null;
  weight: number | null;
  height: number | null;
  experience: string;
  days_per_week: number;
  injuries: string | null;
  preferred_equipment: string | null;
  client_type: "online" | "in_person";
  sessions_per_month: number;
  week_number: number;
  valid: boolean;
  error?: string;
}

export function buildMappedRow(
  row: Record<string, unknown>,
  mapping: Partial<Record<ImportFieldKey, string>>,
  defaultEndDate: string,
): MappedImportRow {
  const cell = (key: ImportFieldKey) => {
    const col = mapping[key];
    if (!col) return "";
    const v = row[col];
    if (v === null || v === undefined) return "";
    return typeof v === "string" ? v : String(v);
  };

  const name = cell("name").trim();
  const emailStr = cell("email").trim();
  const phoneRaw = mapping.phone ? cell("phone").trim() : "";
  const phone = normalizePhone(phoneRaw);

  let endDate = mapping.subscription_end_date ? parseExcelSerialDate(row[mapping.subscription_end_date]) : null;
  if (!endDate) endDate = defaultEndDate;

  const priceRaw = mapping.subscription_price ? row[mapping.subscription_price] : undefined;
  const subscription_price = priceRaw !== undefined && priceRaw !== "" ? parseOptionalNumber(priceRaw) ?? 0 : 0;

  const client_type = parseClientType(mapping.client_type ? cell("client_type") : "");
  const sessions = parseOptionalInt(mapping.sessions_per_month ? row[mapping.sessions_per_month] : "", 0);

  return {
    name,
    phone: phoneRaw ? phone : "",
    email: emailStr ? emailStr.toLowerCase() : null,
    goal: cell("goal").trim() || "غير محدد",
    subscription_price,
    subscription_end_date: endDate,
    age: parseOptionalNumber(mapping.age ? row[mapping.age] : null),
    weight: parseOptionalNumber(mapping.weight ? row[mapping.weight] : null),
    height: parseOptionalNumber(mapping.height ? row[mapping.height] : null),
    experience: parseExperience(mapping.experience ? cell("experience") : ""),
    days_per_week: Math.min(7, Math.max(1, parseOptionalInt(mapping.days_per_week ? row[mapping.days_per_week] : "", 4))),
    injuries: cell("injuries").trim() || null,
    preferred_equipment: cell("preferred_equipment").trim() || null,
    client_type,
    sessions_per_month: client_type === "in_person" ? Math.max(0, sessions) : 0,
    week_number: Math.max(1, parseOptionalInt(mapping.week_number ? row[mapping.week_number] : "", 1)),
    valid: name.length > 0,
    error: name.length === 0 ? "الاسم مطلوب" : undefined,
  };
}

export function markDuplicatePhonesInFile(rows: MappedImportRow[]): MappedImportRow[] {
  const seen = new Map<string, number>();
  return rows.map((r) => {
    if (!r.valid || !r.phone) return r;
    const prev = seen.get(r.phone);
    if (prev !== undefined) {
      return { ...r, valid: false, error: "رقم جوال مكرر في الملف" };
    }
    seen.set(r.phone, 1);
    return r;
  });
}

export function toClientInserts(
  rows: MappedImportRow[],
  trainerId: string,
  today: string,
): ClientInsert[] {
  return rows.map((c) => ({
    trainer_id: trainerId,
    name: c.name,
    phone: c.phone || "",
    email: c.email,
    goal: c.goal,
    subscription_price: c.subscription_price,
    subscription_end_date: c.subscription_end_date,
    last_workout_date: today,
    age: c.age,
    weight: c.weight,
    height: c.height,
    experience: c.experience,
    days_per_week: c.days_per_week,
    injuries: c.injuries,
    preferred_equipment: c.preferred_equipment,
    client_type: c.client_type,
    sessions_per_month: c.sessions_per_month,
    week_number: c.week_number,
    billing_cycle: "monthly",
  }));
}
