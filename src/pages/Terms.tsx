import { Link } from "react-router-dom";
import { Dumbbell, ArrowRight } from "lucide-react";

const sections = [
  { title: "القبول", content: "باستخدامك منصة fitni فإنك توافق على هذه الشروط والأحكام كاملة." },
  { title: "الخدمة", content: "fitni منصة إدارة للمدربين الشخصيين تتيح إدارة العملاء والبرامج والمدفوعات." },
  { title: "الحسابات", content: null, list: [
    "يجب أن تكون +18 سنة",
    "معلوماتك يجب أن تكون صحيحة",
    "أنت مسؤول عن سرية كلمة مرورك",
    "حساب واحد لكل مستخدم",
  ]},
  { title: "الاشتراكات والمدفوعات", content: null, list: [
    "الفترة المجانية: 6 شهور كاملة",
    "بعدها: 49 أو 69 ريال شهريا",
    "الدفع عبر Moyasar",
    "لا يوجد استرداد للمبالغ المدفوعة",
    "يمكن إلغاء الاشتراك في أي وقت",
  ]},
  { title: "استخدام مقبول", content: "يُمنع استخدام المنصة لـ:", list: [
    "نشر محتوى مضلل أو ضار",
    "انتهاك خصوصية الآخرين",
    "أي نشاط غير قانوني",
    "إرسال بريد عشوائي",
  ]},
  { title: "المحتوى", content: null, list: [
    "أنت تملك محتواك",
    "تمنحنا رخصة لعرضه على المنصة",
    "نحتفظ بحق إزالة المحتوى المخالف",
  ]},
  { title: "المسؤولية", content: "fitni غير مسؤولة عن:", list: [
    "النتائج الرياضية للمتدربين",
    "دقة المعلومات الصحية المدخلة",
    "أي أضرار غير مباشرة",
  ]},
  { title: "إنهاء الخدمة", content: "نحتفظ بحق إيقاف الحسابات المخالفة مع إشعار مسبق قدر الإمكان." },
  { title: "التعديلات", content: "نحتفظ بحق تعديل هذه الشروط مع إشعار المستخدمين مسبقا." },
  { title: "القانون المطبق", content: "تخضع هذه الشروط للأنظمة والقوانين المعمول بها في المملكة العربية السعودية." },
  { title: "تواصل معنا", content: "support@fitni.app" },
];

const Terms = () => (
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
          <span className="text-xl font-black text-primary">fitni</span>
        </Link>
      </div>
    </header>

    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-black text-foreground">الشروط والأحكام</h1>
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

export default Terms;
