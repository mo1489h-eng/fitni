import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NpsFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerType: "trial_end" | "payment" | "3months";
}

const NpsFeedbackModal = ({ open, onOpenChange, triggerType }: NpsFeedbackModalProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const getFollowUpQuestion = () => {
    if (score === null) return "";
    if (score <= 6) return "ما الذي كان ينقص fitni؟";
    if (score <= 8) return "ما الذي يمكن تحسينه؟";
    return "ما الذي أعجبك أكثر؟";
  };

  const handleScoreSelect = (s: number) => {
    setScore(s);
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!user || score === null) return;
    setSubmitting(true);
    const { error } = await supabase.from("nps_feedback").insert({
      trainer_id: user.id,
      score,
      comment: comment.trim() || null,
      trigger_type: triggerType,
    });
    setSubmitting(false);
    if (error) {
      toast.error("حدث خطأ في إرسال التقييم");
      return;
    }
    localStorage.setItem(`nps_${triggerType}_${user.id}`, "done");
    toast.success("شكرا لمشاركتك رأيك");
    onOpenChange(false);
    setStep(1);
    setScore(null);
    setComment("");
  };

  const handleSkip = () => {
    if (user) localStorage.setItem(`nps_${triggerType}_${user.id}`, "done");
    onOpenChange(false);
    setStep(1);
    setScore(null);
    setComment("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md border-border bg-[#0f0f0f] p-0"
        aria-describedby={undefined}
      >
        <div className="p-6" dir="rtl">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-foreground">أخبرنا رأيك</h2>
            <p className="mt-1 text-sm text-muted-foreground">30 ثانية تساعدنا نتحسن لك</p>
            <div className="mx-auto mt-3 flex items-center justify-center gap-1.5">
              <div className={`h-1.5 w-8 rounded-full ${step >= 1 ? "bg-primary" : "bg-border"}`} />
              <div className={`h-1.5 w-8 rounded-full ${step >= 2 ? "bg-primary" : "bg-border"}`} />
            </div>
          </div>

          {step === 1 && (
            <div className="space-y-5">
              <p className="text-center text-sm font-medium text-foreground">
                ما مدى احتمال أن توصي بـ fitni لمدرب آخر؟
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {Array.from({ length: 11 }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => handleScoreSelect(i)}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold transition-all ${
                      score === i
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>غير محتمل أبدا</span>
                <span>محتمل جدا</span>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-xl font-black text-primary">{score}</span>
                </div>
                <p className="text-sm font-medium text-foreground">{getFollowUpQuestion()}</p>
              </div>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="شاركنا رأيك..."
                className="min-h-[100px] resize-none border-border bg-background text-right"
              />
              <div className="flex flex-col items-center gap-3">
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full"
                >
                  {submitting ? "جاري الإرسال..." : "إرسال"}
                </Button>
                <button
                  onClick={handleSkip}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  تخطي
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NpsFeedbackModal;
