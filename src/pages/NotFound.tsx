import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(0_0%_2%)]" dir="rtl">
      <div className="text-center space-y-4">
        <FileQuestion className="w-16 h-16 text-muted-foreground/30 mx-auto" strokeWidth={1.5} />
        <h1 className="text-5xl font-black text-foreground tabular-nums">404</h1>
        <p className="text-lg text-muted-foreground">الصفحة غير موجودة</p>
        <Button asChild>
          <Link to="/">العودة للرئيسية</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
