/** Arabic UI labels → ExerciseDB `bodyPart` / equipment strings (English, API-native). */
export const MUSCLE_FILTER_OPTIONS: { label: string; bodyPart: string }[] = [
  { label: "صدر", bodyPart: "chest" },
  { label: "ظهر", bodyPart: "back" },
  { label: "أكتاف", bodyPart: "shoulders" },
  { label: "أرجل", bodyPart: "upper legs" },
  { label: "سمانة", bodyPart: "lower legs" },
  { label: "بايسبس / ترايسبس", bodyPart: "upper arms" },
  { label: "ساعد", bodyPart: "lower arms" },
  { label: "بطن / كور", bodyPart: "waist" },
  { label: "كارديو", bodyPart: "cardio" },
];

export const EQUIPMENT_FILTER_OPTIONS: { label: string; match: string }[] = [
  { label: "دمبل", match: "dumbbell" },
  { label: "بار", match: "barbell" },
  { label: "كيبل", match: "cable" },
  { label: "وزن الجسم", match: "body weight" },
  { label: "آلة", match: "machine" },
  { label: "كيتلبل", match: "kettlebell" },
];
