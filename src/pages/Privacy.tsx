import { Link } from "react-router-dom";
import { Dumbbell, ArrowRight } from "lucide-react";

const sections = [
  { title: "مقدمة", content: "تلتزم منصة CoachBase بحماية خصوصية مستخدميها. تصف هذه السياسة كيفية جمع بياناتك واستخدامها وحمايتها." },
  { title: "البيانات التي نجمعها", content: null, list: [
    "الاسم والبريد الإلكتروني",
    "رقم الجوال",
    "بيانات اللياقة البدنية (الوزن، الطول، قياسات الجسم)",
    "بيانات التمارين والتغذية",
    "معلومات الدفع (نعالجها عبر Tap Payments ولا نخزنها)",
    "صور الجسم (اختياري)",
  ]},
  { title: "كيف نستخدم بياناتك", content: null, list: [
    "تقديم خدمات المنصة",
    "تحسين تجربة المستخدم",
    "إرسال إشعارات وتقارير",
    "التواصل معك بخصوص حسابك",
    "تحليل استخدام المنصة",
  ]},
  { title: "مشاركة البيانات", content: "لا نبيع بياناتك لأي طرف ثالث. نشارك البيانات فقط مع:", list: [
    "مدربك الشخصي (ببياناتك الرياضية)",
    "Supabase (تخزين البيانات)",
    "Tap Payments (معالجة المدفوعات)",
    "Resend (إرسال الإيميلات)",
  ]},
  { title: "حماية البيانات", content: null, list: [
    "تشفير SSL لجميع البيانات",
    "تخزين آمن عبر Supabase",
    "صلاحيات وصول محدودة",
    "مراجعات أمنية دورية",
  ]},
  { title: "حقوقك", content: null, list: [
    "الاطلاع على بياناتك",
    "تعديل بياناتك",
    "حذف حسابك وبياناتك",
    "تصدير بياناتك",
  ]},
  { title: "ملفات تعريف الارتباط", content: "نستخدم ملفات تعريف الارتباط لتحسين تجربتك وحفظ تفضيلاتك." },
  { title: "تواصل معنا", content: "لأي استفسار عن الخصوصية: support@coachbase.health" },
];

const Privacy = () => (
  <div className="min-h-screen bg-background text-foreground" dir="rtl">
    <header className="border-b border-border px-4 py-4">
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <Link to="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
          <ArrowRight className="h-5 w-5" />
        </Link>
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Dumbbell className="h-4 w-4" />
          </div>
          <span className="text-xl font-black text-primary">CoachBase</span>
        </Link>
      </div>
    </header>

    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-black text-foreground">سياسة الخصوصية</h1>
      <p className="mt-2 text-sm text-muted-foreground">آخر تحديث: مارس 2026</p>

      <div className="mt-10 space-y-10">
        {sections.map((s, i) => (
          <section key={i}>
            <h2 className="text-lg font-bold text-primary">{i + 1}. {s.title}</h2>
            {s.content && <p className="mt-3 leading-8 text-foreground/70">{s.content}</p>}
            {s.list && (
              <ul className="mt-3 space-y-2 pr-5">
                {s.list.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 leading-8 text-foreground/70">
                    <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </main>
  </div>
);

export default Privacy;
