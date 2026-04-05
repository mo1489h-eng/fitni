import { useNavigate } from "react-router-dom";
import { X, Eye } from "lucide-react";

const IMPERSONATION_KEY = "trainer_impersonation";

export interface ImpersonationData {
  clientName: string;
  clientId: string;
  returnPath: string;
}

export const startImpersonation = (data: ImpersonationData) => {
  sessionStorage.setItem(IMPERSONATION_KEY, JSON.stringify(data));
};

export const getImpersonation = (): ImpersonationData | null => {
  const raw = sessionStorage.getItem(IMPERSONATION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const clearImpersonation = () => {
  sessionStorage.removeItem(IMPERSONATION_KEY);
};

const ImpersonationBanner = () => {
  const navigate = useNavigate();
  const data = getImpersonation();

  if (!data) return null;

  const handleExit = () => {
    const returnPath = data.returnPath;
    clearImpersonation();
    sessionStorage.removeItem("portal_token");
    navigate(returnPath);
  };

  return (
    <div className="sticky top-0 z-[60] bg-amber-500 text-black px-4 py-2.5 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-sm font-bold">
        <Eye className="w-4 h-4" />
        <span>أنت تشاهد كـ {data.clientName} — اضغط للخروج</span>
      </div>
      <button
        onClick={handleExit}
        className="flex items-center gap-1 bg-black/20 hover:bg-black/30 rounded-lg px-3 py-1 text-sm font-medium transition-colors"
      >
        <X className="w-4 h-4" />
        خروج
      </button>
    </div>
  );
};

export default ImpersonationBanner;
