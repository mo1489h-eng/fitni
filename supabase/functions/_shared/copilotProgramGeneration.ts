/**
 * Copilot program generation: client data validation + prompt building (NSCA/ACSM/ACE-aligned).
 */

export type MissingField = { key: string; labelAr: string };

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Goal must match at least one training intent (Arabic or English). */
function goalLooksDetailed(goal: string): boolean {
  const g = goal.trim();
  if (g.length < 2) return false;
  const patterns = [
    /خسارة|نزول|تنشيف|دهون|تخسيس|رشاقة|وزن/i,
    /تضخيم|بانش|عضل|كتلة|حجم|bulking/i,
    /لياقة|لياقة بدنية|صحة|عامة|maintain|fitness/i,
    /قوة|strength|رفع أثقال|max/i,
    /تعافي|تأهيل|rehab|إعادة|علاج طبيعي/i,
    /weight\s*loss|fat\s*loss|muscle|hypertrophy|strength|rehab/i,
  ];
  return patterns.some((p) => p.test(g));
}

function fitnessLevelOk(experience: string | null | undefined): boolean {
  const e = String(experience ?? "").trim().toLowerCase();
  if (!e) return false;
  const keys = ["مبتدئ", "متوسط", "متقدم", "beginner", "intermediate", "advanced"];
  return keys.some((k) => e.includes(k));
}

/**
 * Required profile data before calling the LLM for program generation.
 * Injuries: empty/null means «لا يوجد» — not treated as missing.
 * Program duration: enforced via program.weeks in output; use existingProgram.weeks as hint when present.
 */
export function collectMissingProgramFields(
  client: Record<string, unknown>,
  scan: Record<string, unknown> | null | undefined,
  measurements: Record<string, unknown>[],
): MissingField[] {
  const missing: MissingField[] = [];

  const age = numOrNull(client.age) ?? numOrNull(scan?.age);
  if (age == null || age < 8 || age > 100) {
    missing.push({ key: "age", labelAr: "العمر" });
  }

  const weight =
    numOrNull(client.weight) ??
    numOrNull(scan?.weight) ??
    (measurements[0] ? numOrNull(measurements[0].weight) : null);
  if (weight == null || weight <= 0 || weight > 600) {
    missing.push({ key: "weight", labelAr: "الوزن (كجم)" });
  }

  const height = numOrNull(client.height) ?? numOrNull(scan?.height);
  if (height == null || height <= 0 || height > 260) {
    missing.push({ key: "height", labelAr: "الطول (سم)" });
  }

  const goal = String(client.goal ?? "").trim();
  if (!goalLooksDetailed(goal)) {
    missing.push({
      key: "goal",
      labelAr: "الهدف التفصيلي (خسارة وزن / تضخيم / لياقة / قوة / إعادة تأهيل)",
    });
  }

  if (!fitnessLevelOk(client.experience as string | null)) {
    missing.push({ key: "experience", labelAr: "مستوى اللياقة (مبتدئ / متوسط / متقدم)" });
  }

  const days = numOrNull(client.days_per_week);
  if (days == null || days < 1 || days > 7) {
    missing.push({ key: "days_per_week", labelAr: "أيام التدريب في الأسبوع" });
  }

  const equip = String(client.preferred_equipment ?? "").trim();
  if (!equip) {
    missing.push({
      key: "preferred_equipment",
      labelAr: "المعدات المتاحة (جيم / منزل / بدون معدات)",
    });
  }

  return missing;
}

export function buildClientProfile(
  client: Record<string, unknown>,
  scan: Record<string, unknown> | null | undefined,
  measurements: Record<string, unknown>[],
  existingProgram: Record<string, unknown> | null | undefined,
) {
  const weight =
    client.weight ??
    scan?.weight ??
    (measurements[0]?.weight as unknown) ??
    "unknown";
  const height = client.height ?? scan?.height ?? "unknown";
  const age = client.age ?? scan?.age ?? "unknown";

  const injuriesRaw = client.injuries;
  const injuriesDisplay =
    injuriesRaw != null && String(injuriesRaw).trim() !== ""
      ? String(injuriesRaw).trim()
      : "لا يوجد (لم يُذكر في الملف)";

  const programWeeksHint =
    existingProgram && numOrNull(existingProgram.weeks) != null && Number(existingProgram.weeks) > 0
      ? Number(existingProgram.weeks)
      : null;

  return {
    name: client.name,
    goal: client.goal,
    weight,
    height,
    age,
    gender: scan?.gender ?? "unknown",
    bodyFat: scan?.body_fat ?? "unknown",
    bmi: scan?.bmi ?? "unknown",
    activityLevel: scan?.activity_level ?? "unknown",
    tdee: scan?.tdee ?? "unknown",
    weekNumber: client.week_number,
    experience: client.experience || "مبتدئ",
    daysPerWeek: client.days_per_week ?? 4,
    injuries: injuriesDisplay,
    equipment: client.preferred_equipment || null,
    programWeeksHint,
  };
}

function getPeriodizationType(experience: string): string {
  if (experience === "مبتدئ") return "linear";
  if (experience === "متوسط") return "undulating";
  return "block";
}

export function buildProgramPrompt(profile: Record<string, unknown>, existingProgram: Record<string, unknown> | null) {
  const experience = String(profile.experience ?? "مبتدئ");
  const periodization = getPeriodizationType(experience);
  const periodizationLabel =
    periodization === "linear"
      ? "خطي (Linear)"
      : periodization === "undulating"
        ? "متموج (Undulating)"
        : "كتلي (Block)";

  const goalStr = String(profile.goal ?? "");
  const goalContext =
    goalStr.includes("خسارة") || goalStr.includes("نزول") || goalStr.includes("تنشيف") ||
      /weight\s*loss|fat\s*loss/i.test(goalStr)
      ? "الهدف خسارة دهون — برامج ترفع إنفاق الطاقة مع مقاومة معتدلة إلى عالية؛ كارديو منطقي؛ عجز سعراتي معتدل تحت الصيانة عند الحاجة."
      : goalStr.includes("تضخيم") || goalStr.includes("بناء") || goalStr.includes("عضل") ||
          /muscle|hypertrophy|bulk/i.test(goalStr)
      ? "الهدف بناء عضلات — بروتوكولات تمكين (8-12 تكراراً في الأساس)، حجم تدريبي كافٍ، تدرج في الحمل، راحات مناسبة للتعافي."
      : goalStr.includes("قوة") || /strength/i.test(goalStr)
      ? "الهدف قوة — تمارين مركبة ثقيلة، مجموعات أقل وتكرارات أقل نسبياً، تدرج محسوب، راحات أطول."
      : goalStr.includes("تعافي") || goalStr.includes("تأهيل") || /rehab/i.test(goalStr)
      ? "الهدف تعافي/إعادة تأهيل — حجم منخفض، تقنية آمنة، تجنب ما يزيد الألم أو يخالف القيود؛ تقدم بطيء."
      : "الهدف لياقة عامة — توازن بين مقاومة وكارديو، شدة متوسطة، تنوع آمن.";

  const weeksHint =
    profile.programWeeksHint != null
      ? `المدة المستهدفة للبرنامج: ${profile.programWeeksHint} أسبوعاً (مستخرجة من البرنامج الحالي إن وُجد).`
      : "لم تُحدد مدة برنامج سابقة في النظام — اضبط program.weeks بين 8 و 12 أسبوعاً بما يتناسب مع الهدف والمستوى، واذكر المدة في الملخص.";

  const systemPrompt = `أنت مدرب شخصي معتمد من الدرجة الأولى، بمعرفة عميقة بعلوم التمرين وفق معايير NSCA وACSM وACE.

عند بناء برامج التمرين:
- اربط كل توصية بأدلة تطبيقية سليمة وتدرج في الحمل (progressive overload).
- راعِ بيانات العميل المحددة (العمر، الوزن، الطول، المستوى، القيود).
- لخسارة الوزن: دمج مقاومة وكارديو بشكل منطقي لرفع الإنفاق الطاقي مع الحفاظ على الكتلة العضلية قدر الإمكان.
- لبناء العضلات: بروتوكولات تمكين (مثلاً 8-12 تكراراً في الجزء الأكبر من الحجم)، حجم أسبوعي كافٍ، وتدرج منتظم.
- للمبتدئين: بداية محافظة، تمارين أساسية، تركيز على الأداء الآمن والتقنية.
- للمتقدمين: تنويع واضح، ويمكن ذكر فترات أو تغييرات شبه دورية عند الحاجة.
- أدرج دائماً إحماءً منظماً وتمارين برودة (cool-down) لكل يوم تدريب.
- حدد بدقة: المجموعات، التكرارات، زمن الراحة بالثواني، والتمبو (مثل 3-1-1-0) للتمارين المناسبة.
- قدّم بدائل تمارين عندما تكون المعدات محدودة.
- لا تقدّم تشخيصاً طبياً ولا وصفات دواء؛ التغذية إرشاد عام فقط.

قواعد المخرجات:
- أجب بالعربية في النصوص والملاحظات.
- أعد JSON فقط دون أي نص خارج الكائن ودون حواجز markdown.
- إذا لاحظت نقصاً أو غموضاً في بيانات العميل داخل رسالة المستخدم، املأ "data_gaps" بنصوص عربية تُسمّي بالضبط ما الناقص قبل أو بجانب البرنامج؛ إن لم يكن هناك نقص فاستخدم "data_gaps": [].

هيكل JSON المطلوب:
{
  "data_gaps": [],
  "program": {
    "name": "اسم يعكس الهدف",
    "weeks": 12,
    "periodization": "${periodization}",
    "days": [
      {
        "day_name": "اسم اليوم",
        "day_order": 0,
        "movement_balance": "push/pull/legs/full",
        "warmup": [
          { "name": "اسم عربي", "name_en": "English name", "muscle_groups": ["..."], "sets": 2, "reps": 15, "weight": 0, "rest_seconds": 30, "tempo": "", "rpe": null, "coaching_notes": "ملاحظات تقنية", "substitutions": [], "is_warmup": true }
        ],
        "exercises": [
          {
            "name": "اسم التمرين بالعربية",
            "name_en": "Exercise in English",
            "muscle_groups": ["مثلاً: صدر", "ترايسبس"],
            "sets": 3,
            "reps": 12,
            "weight": 0,
            "rest_seconds": 90,
            "tempo": "3-1-1-0",
            "rpe": 7,
            "coaching_notes": "توجيهات للعميل والمدرب",
            "substitutions": ["بديل 1", "بديل 2"],
            "is_warmup": false,
            "exercise_order": 0,
            "superset_group": null
          }
        ],
        "cooldown": [
          { "name": "...", "name_en": "...", "muscle_groups": [], "sets": 1, "reps": 1, "weight": 0, "rest_seconds": 30, "tempo": "", "rpe": null, "coaching_notes": "", "substitutions": [], "is_cooldown": true }
        ]
      }
    ],
    "weekly_progression": {
      "week1": "وصف التقدم الأسبوع 1",
      "week2": "...",
      "week3": "...",
      "week4": "أسبوع تخفيف أو تعديل الحمل إن لزم"
    }
  },
  "meal_plan": {
    "name": "اسم خطة التغذية",
    "notes": "ملاحظات عامة للوجبات والماكروز",
    "meals": [
      { "meal_name": "الفطور", "food_name": "...", "calories": 300, "protein": 25, "carbs": 30, "fats": 10, "quantity": "الكمية", "item_order": 0 }
    ]
  },
  "nutrition_guidance": "فقرة إرشاد غذائي عام (ليست استشارة طبية ولا علاج مرض)",
  "summary": "ملخص: لماذا البرنامج مناسب + التدوير + التدرج + أي ملاحظة على المدة والمعدات"
}`;

  const userPrompt = `أنشئ برنامج تدريباً وخطة تغذية مخصصة لهذا العميل (بيانات مكتملة من الملف):

📋 بيانات العميل:
- الاسم: ${profile.name}
- الهدف: ${profile.goal}
- الوزن: ${profile.weight} كجم
- الطول: ${profile.height} سم
- العمر: ${profile.age}
- الجنس: ${profile.gender === "male" ? "ذكر" : profile.gender === "female" ? "أنثى" : "غير محدد"}
- نسبة الدهون: ${profile.bodyFat}%
- BMI: ${profile.bmi}
- مستوى النشاط: ${profile.activityLevel}
- TDEE: ${profile.tdee} سعرة
- الأسبوع الحالي: ${profile.weekNumber}
- مستوى اللياقة / الخبرة: ${profile.experience}
- أيام التدريب في الأسبوع: ${profile.daysPerWeek}
- إصابات أو قيود: ${profile.injuries}
- المعدات المتاحة: ${profile.equipment || "غير محدد — استخدم بدائل واضحة"}
${weeksHint}

🎯 توجيه الهدف:
${goalContext}

📐 نوع التدوير المطلوب: ${periodizationLabel}

${existingProgram ? `📌 البرنامج الحالي: ${existingProgram.name} (${existingProgram.weeks} أسابيع) — أنشئ برنامجاً محدثاً ومبنياً على البيانات أعلاه` : "لا يوجد برنامج حالي — أنشئ برنامجاً من الصفر"}

متطلبات الجلسة:
1. أنشئ ${profile.daysPerWeek} أيام تدريب مع تقسيم عضلي متوازن (Push/Pull أو ما يناسب المعدات).
2. لكل يوم: إحماء 2-3 تمارين (is_warmup: true)، تمارين رئيسية كاملة الحقول (name + name_en + muscle_groups + coaching_notes + substitutions)، وبرودة cooldown.
3. استخدم RPE مناسباً لمستوى ${profile.experience}.
4. التمبو للمركبات الرئيسية؛ راحات: عزل ~60-90ث، مركبة ~120-180ث ما لم يُستثنَ.
5. اذكر أسبوع تخفيف أو تعديل حجم في weekly_progression عند الحاجة.
6. اقترح أوزاناً بداية معقولة حسب المستوى.
7. خطة وجبات 5-7 وجبات مع ماكروز متناسقة مع الهدف وTDEE عند توفره؛ أطعمة محلية عندما يناسب.
8. املأ nutrition_guidance بإرشاد عام فقط (لا طبي).

${String(profile.injuries).includes("لا يوجد") ? "" : `⚠️ تجنب ما يزيد الضرر على: ${profile.injuries}`}
${profile.equipment ? `🏋️ التزم بما هو متاح: ${profile.equipment}` : ""}`;

  return { systemPrompt, userPrompt };
}
