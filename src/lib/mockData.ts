export interface Trainer {
  id: string;
  name: string;
  phone: string;
}

export interface Client {
  id: string;
  trainer_id: string;
  name: string;
  phone: string;
  goal: string;
  subscription_price: number;
  subscription_end_date: string;
  week_number: number;
  last_workout_date: string;
}

export interface Program {
  id: string;
  trainer_id: string;
  name: string;
  weeks: number;
  client_id?: string;
}

export interface ProgramDay {
  id: string;
  program_id: string;
  day_number: number;
  name: string;
}

export interface Exercise {
  id: string;
  day_id: string;
  name: string;
  sets: number;
  reps: number;
  target_weight: number;
}

export interface WorkoutLog {
  id: string;
  client_id: string;
  exercise_id: string;
  actual_sets: number;
  actual_reps: number;
  actual_weight: number;
  date: string;
}

export interface Measurement {
  id: string;
  client_id: string;
  weight: number;
  body_fat: number;
  date: string;
}

export interface Payment {
  id: string;
  client_id: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
  due_date: string;
  paid_date?: string;
}

// Mock Data
const today = new Date();
const daysAgo = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
};
const daysFromNow = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
};

export const mockClients: Client[] = [
  { id: "c1", trainer_id: "t1", name: "أحمد الغامدي", phone: "0551234567", goal: "خسارة وزن", subscription_price: 800, subscription_end_date: daysFromNow(20), week_number: 4, last_workout_date: daysAgo(1) },
  { id: "c2", trainer_id: "t1", name: "فهد العتيبي", phone: "0559876543", goal: "بناء عضل", subscription_price: 1000, subscription_end_date: daysFromNow(5), week_number: 8, last_workout_date: daysAgo(2) },
  { id: "c3", trainer_id: "t1", name: "خالد الشمري", phone: "0553456789", goal: "لياقة عامة", subscription_price: 600, subscription_end_date: daysAgo(3), week_number: 2, last_workout_date: daysAgo(7) },
  { id: "c4", trainer_id: "t1", name: "عبدالله القحطاني", phone: "0557654321", goal: "خسارة وزن", subscription_price: 800, subscription_end_date: daysFromNow(30), week_number: 12, last_workout_date: daysAgo(0) },
  { id: "c5", trainer_id: "t1", name: "سعد الدوسري", phone: "0552345678", goal: "تقوية", subscription_price: 700, subscription_end_date: daysFromNow(3), week_number: 6, last_workout_date: daysAgo(6) },
  { id: "c6", trainer_id: "t1", name: "محمد الحربي", phone: "0558765432", goal: "بناء عضل", subscription_price: 900, subscription_end_date: daysAgo(10), week_number: 3, last_workout_date: daysAgo(10) },
];

export const mockPrograms: Program[] = [
  { id: "p1", trainer_id: "t1", name: "برنامج خسارة الوزن - مبتدئ", weeks: 8, client_id: "c1" },
  { id: "p2", trainer_id: "t1", name: "برنامج بناء العضلات - متقدم", weeks: 12, client_id: "c2" },
  { id: "p3", trainer_id: "t1", name: "برنامج لياقة عامة", weeks: 4 },
];

export const mockProgramDays: ProgramDay[] = [
  { id: "d1", program_id: "p1", day_number: 1, name: "صدر وترايسبس" },
  { id: "d2", program_id: "p1", day_number: 2, name: "ظهر وبايسبس" },
  { id: "d3", program_id: "p1", day_number: 3, name: "أرجل" },
  { id: "d4", program_id: "p1", day_number: 4, name: "أكتاف وبطن" },
];

export const mockExercises: Exercise[] = [
  { id: "e1", day_id: "d1", name: "بنش بريس", sets: 4, reps: 10, target_weight: 60 },
  { id: "e2", day_id: "d1", name: "تفتيح دمبل", sets: 3, reps: 12, target_weight: 14 },
  { id: "e3", day_id: "d1", name: "بوش أب", sets: 3, reps: 15, target_weight: 0 },
  { id: "e4", day_id: "d1", name: "تراي بوش داون", sets: 3, reps: 12, target_weight: 25 },
  { id: "e5", day_id: "d2", name: "سحب أمامي", sets: 4, reps: 10, target_weight: 50 },
  { id: "e6", day_id: "d2", name: "تجديف بار", sets: 4, reps: 10, target_weight: 40 },
  { id: "e7", day_id: "d3", name: "سكوات", sets: 4, reps: 10, target_weight: 80 },
  { id: "e8", day_id: "d3", name: "ليق بريس", sets: 4, reps: 12, target_weight: 120 },
  { id: "e9", day_id: "d4", name: "شولدر بريس", sets: 4, reps: 10, target_weight: 30 },
  { id: "e10", day_id: "d4", name: "كرنش", sets: 3, reps: 20, target_weight: 0 },
];

export const mockMeasurements: Measurement[] = [
  { id: "m1", client_id: "c1", weight: 95, body_fat: 28, date: daysAgo(60) },
  { id: "m2", client_id: "c1", weight: 92, body_fat: 26, date: daysAgo(45) },
  { id: "m3", client_id: "c1", weight: 89, body_fat: 24, date: daysAgo(30) },
  { id: "m4", client_id: "c1", weight: 87, body_fat: 22, date: daysAgo(15) },
  { id: "m5", client_id: "c1", weight: 85, body_fat: 21, date: daysAgo(0) },
];

export const mockPayments: Payment[] = [
  { id: "pay1", client_id: "c1", amount: 800, status: "paid", due_date: daysAgo(30), paid_date: daysAgo(28) },
  { id: "pay2", client_id: "c1", amount: 800, status: "paid", due_date: daysAgo(0), paid_date: daysAgo(0) },
  { id: "pay3", client_id: "c2", amount: 1000, status: "paid", due_date: daysAgo(15), paid_date: daysAgo(14) },
  { id: "pay4", client_id: "c3", amount: 600, status: "overdue", due_date: daysAgo(5) },
  { id: "pay5", client_id: "c4", amount: 800, status: "paid", due_date: daysAgo(10), paid_date: daysAgo(10) },
  { id: "pay6", client_id: "c5", amount: 700, status: "pending", due_date: daysFromNow(5) },
  { id: "pay7", client_id: "c6", amount: 900, status: "overdue", due_date: daysAgo(15) },
];

export const exerciseLibrary = [
  "بنش بريس", "بنش بريس مائل", "تفتيح دمبل", "بوش أب", "ديبس",
  "سحب أمامي", "سحب خلفي", "تجديف بار", "تجديف دمبل", "ديدلفت",
  "سكوات", "ليق بريس", "ليق اكستنشن", "ليق كيرل", "لانجز",
  "شولدر بريس", "رفرفة جانبية", "رفرفة أمامية", "شرق",
  "بايسبس كيرل", "هامر كيرل", "تراي بوش داون", "فرنش بريس",
  "كرنش", "بلانك", "ليق ريز", "روسيان تويست",
  "كارديو - مشي", "كارديو - جري", "كارديو - دراجة",
];

export function getClientPaymentStatus(client: Client): "active" | "overdue" | "expiring" {
  const endDate = new Date(client.subscription_end_date);
  const now = new Date();
  const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "overdue";
  if (diffDays <= 7) return "expiring";
  return "active";
}

export function getInactiveClients(clients: Client[]): Client[] {
  return clients.filter(c => {
    const lastDate = new Date(c.last_workout_date);
    const diff = Math.ceil((new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 5;
  });
}

export function getExpiringClients(clients: Client[]): Client[] {
  return clients.filter(c => {
    const endDate = new Date(c.subscription_end_date);
    const diff = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 7;
  });
}
