import { AlertTriangle } from "lucide-react";

const TapTestModeBanner = () => (
  <div className="w-full bg-yellow-500/15 border border-yellow-500/30 rounded-lg px-4 py-2.5 flex items-center gap-2.5" dir="rtl">
    <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
    <div className="flex-1">
      <span className="text-sm font-semibold text-yellow-400">⚠️ وضع الاختبار</span>
      <span className="text-xs text-yellow-500/80 mr-2">
        — الدفعات غير حقيقية. بطاقات الاختبار: Visa: 4111111111111111 | Mada: 5588480000000003 | أي تاريخ مستقبلي | أي CVV
      </span>
    </div>
  </div>
);

export default TapTestModeBanner;
