export type TrainerPlan = "free" | "basic" | "pro";

export interface PlanDetails {
  name: string;
  price: number;
  clientLimit: number;
  durationLabel?: string;
  includedFeatures: string[];
  excludedFeatures?: string[];
}

export const TRAINER_PLAN_DETAILS: Record<TrainerPlan, PlanDetails> = {
  free: {
    name: "مجاني",
    price: 0,
    clientLimit: 10,
    durationLabel: "6 أشهر من التسجيل",
    includedFeatures: [
      "حتى 10 عملاء",
      "إدارة العملاء",
      "البرامج التدريبية",
      "الخطط الغذائية",
      "التقويم",
      "بوابة العميل",
      "الصفحة العامة",
      "المدفوعات",
      "المزايا الأساسية",
    ],
    excludedFeatures: ["AI كوبايلت", "التحديات الجماعية", "سوق البرامج", "Nearby Discovery"],
  },
  basic: {
    name: "أساسي",
    price: 49,
    clientLimit: 10,
    includedFeatures: [
      "حتى 10 عملاء",
      "إدارة العملاء",
      "البرامج التدريبية",
      "الخطط الغذائية",
      "التقويم",
      "بوابة العميل",
      "التقارير الأسبوعية",
      "الصفحة العامة للمدرب",
      "تحصيل المدفوعات",
      "تحليلات أساسية",
    ],
    excludedFeatures: ["AI كوبايلت", "التحديات الجماعية", "سوق البرامج", "Nearby Discovery"],
  },
  pro: {
    name: "احترافي",
    price: 69,
    clientLimit: Number.POSITIVE_INFINITY,
    includedFeatures: [
      "عملاء غير محدودين",
      "كل مزايا الأساسي",
      "AI كوبايلت",
      "التحديات الجماعية",
      "سوق البرامج",
      "تحليلات متقدمة",
      "Nearby Discovery",
      "دعم أولوية",
    ],
  },
};

export const PRO_UPGRADE_PROMPT = {
  title: "هذه الميزة للباقة الاحترافية ⭐",
  description: "احصل على عملاء غير محدودين + AI كوبايلت + التحديات الجماعية",
  ctaText: "ترقية للاحترافي - 69 ريال/شهر ←",
  secondaryText: "لاحقاً",
};

export const BASIC_LIMIT_PROMPT = {
  title: "وصلت الحد الأقصى للباقة الأساسية",
  description: "ترقّ للاحترافي لإضافة عملاء غير محدودين",
  ctaText: "ترقية الآن ←",
  secondaryText: "لاحقاً",
};
