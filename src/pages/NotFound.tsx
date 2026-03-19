import { Link } from "react-router-dom";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => (
  <div className="flex min-h-screen items-center justify-center bg-background" dir="rtl">
    <div className="text-center space-y-5 animate-fade-in">
      <FileQuestion className="w-16 h-16 text-muted-foreground/20 mx-auto" strokeWidth={1.5} />
      <h1 className="text-7xl font-black text-muted-foreground/30 tabular-nums">404</h1>
      <p className="text-lg font-semibold text-foreground">الصفحة غير موجودة</p>
      <p className="text-sm text-muted-foreground">يبدو أن هذه الصفحة لا وجود لها</p>
      <Button asChild size="lg">
        <Link to="/">العودة للرئيسية</Link>
      </Button>
    </div>
  </div>
);

export default NotFound;
