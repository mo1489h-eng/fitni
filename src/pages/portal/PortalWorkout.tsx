import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ClientPortalLayout from "@/components/ClientPortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Check, ArrowLeft, Timer, PartyPopper } from "lucide-react";

interface ExerciseData {
  name: string;
  muscle: string;
  sets: number;
  reps: number;
  weight: number;
}

const exercises: ExerciseData[] = [
  { name: "بنش بريس", muscle: "صدر", sets: 4, reps: 10, weight: 80 },
  { name: "تفتيح دمبل", muscle: "صدر", sets: 3, reps: 12, weight: 14 },
  { name: "بوش أب", muscle: "صدر", sets: 3, reps: 15, weight: 0 },
  { name: "تراي بوش داون", muscle: "ترايسبس", sets: 3, reps: 12, weight: 25 },
  { name: "فرنش بريس", muscle: "ترايسبس", sets: 3, reps: 10, weight: 20 },
];

const PortalWorkout = () => {
  const navigate = useNavigate();
  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [actualWeight, setActualWeight] = useState("");
  const [actualReps, setActualReps] = useState("");
  const [resting, setResting] = useState(false);
  const [restTime, setRestTime] = useState(60);
  const [completed, setCompleted] = useState(false);
  const [startTime] = useState(Date.now());
  const [totalSets, setTotalSets] = useState(0);

  const ex = exercises[currentExIdx];
  const isLastSet = currentSet >= (ex?.sets || 0);
  const isLastExercise = currentExIdx >= exercises.length - 1;

  // Rest timer
  useEffect(() => {
    if (!resting) return;
    if (restTime <= 0) {
      setResting(false);
      setRestTime(60);
      return;
    }
    const t = setTimeout(() => setRestTime((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resting, restTime]);

  const handleCompleteSet = useCallback(() => {
    setTotalSets((s) => s + 1);

    if (isLastSet && isLastExercise) {
      setCompleted(true);
      return;
    }

    if (isLastSet) {
      // Move to next exercise
      setCurrentExIdx((i) => i + 1);
      setCurrentSet(1);
      setActualWeight("");
      setActualReps("");
    } else {
      // Rest then next set
      setCurrentSet((s) => s + 1);
      setResting(true);
      setActualWeight("");
      setActualReps("");
    }
  }, [isLastSet, isLastExercise]);

  const skipRest = () => {
    setResting(false);
    setRestTime(60);
  };

  // Completion screen
  if (completed) {
    const mins = Math.round((Date.now() - startTime) / 60000);
    return (
      <ClientPortalLayout>
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center animate-fade-in space-y-6">
          {/* Confetti-like decorations */}
          <div className="relative">
            <div className="text-6xl mb-2">🎉</div>
            <div className="absolute -top-4 -right-6 text-2xl animate-bounce" style={{ animationDelay: "0.1s" }}>🌟</div>
            <div className="absolute -top-2 -left-8 text-xl animate-bounce" style={{ animationDelay: "0.3s" }}>✨</div>
            <div className="absolute top-8 -right-10 text-lg animate-bounce" style={{ animationDelay: "0.5s" }}>💪</div>
          </div>

          <h1 className="text-2xl font-bold text-foreground">أحسنت! أنهيت تمرين اليوم</h1>

          <div className="flex gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{exercises.length}</p>
              <p className="text-xs text-muted-foreground">تمارين</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{totalSets}</p>
              <p className="text-xs text-muted-foreground">سيت</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{mins || 1}</p>
              <p className="text-xs text-muted-foreground">دقيقة</p>
            </div>
          </div>

          <Button className="w-full max-w-xs py-6 text-base" onClick={() => navigate("/client-portal")}>
            عودة للرئيسية
          </Button>
        </div>
      </ClientPortalLayout>
    );
  }

  // Rest timer screen
  if (resting) {
    const circumference = 2 * Math.PI * 45;
    const dashOffset = circumference * (1 - restTime / 60);
    return (
      <ClientPortalLayout>
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center animate-fade-in space-y-6">
          <Timer className="w-6 h-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">وقت الراحة</p>

          <div className="relative w-36 h-36">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
              <circle
                cx="50" cy="50" r="45" fill="none"
                stroke="hsl(142, 76%, 36%)" strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-bold text-foreground">{restTime}</span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            السيت التالي: {currentSet} من {ex.sets}
          </p>

          <Button variant="outline" onClick={skipRest}>تخطي الراحة</Button>
        </div>
      </ClientPortalLayout>
    );
  }

  // Active workout
  const exerciseProgress = ((currentExIdx) / exercises.length) * 100;

  return (
    <ClientPortalLayout>
      <div className="space-y-5 animate-fade-in">
        {/* Progress */}
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>تمرين {currentExIdx + 1} من {exercises.length}</span>
            <span>{Math.round(exerciseProgress)}%</span>
          </div>
          <Progress value={exerciseProgress} className="h-2" />
        </div>

        {/* Exercise Info */}
        <Card className="p-5 text-center">
          <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
            {ex.muscle}
          </span>
          <h1 className="text-2xl font-bold text-card-foreground mt-3 mb-2">{ex.name}</h1>
          <p className="text-muted-foreground">
            المطلوب: {ex.sets} سيت × {ex.reps} تكرار
            {ex.weight > 0 && ` × ${ex.weight} كجم`}
          </p>
        </Card>

        {/* Set Logging */}
        <Card className="p-5">
          <h3 className="font-bold text-card-foreground text-center mb-4">
            السيت {currentSet} من {ex.sets}
          </h3>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">الوزن الفعلي (كجم)</label>
              <Input
                type="number"
                dir="ltr"
                placeholder={String(ex.weight || "—")}
                value={actualWeight}
                onChange={(e) => setActualWeight(e.target.value)}
                className="text-center text-lg"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">التكرارات الفعلية</label>
              <Input
                type="number"
                dir="ltr"
                placeholder={String(ex.reps)}
                value={actualReps}
                onChange={(e) => setActualReps(e.target.value)}
                className="text-center text-lg"
              />
            </div>
          </div>

          <Button className="w-full py-6 text-base gap-2" onClick={handleCompleteSet}>
            <Check className="w-5 h-5" />
            {isLastSet && isLastExercise ? "إنهاء التمرين 🎉" : "✅ أنهيت السيت"}
          </Button>
        </Card>

        {/* Next exercise preview */}
        {!isLastExercise && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="w-4 h-4" />
            <span>التمرين التالي: {exercises[currentExIdx + 1]?.name}</span>
          </div>
        )}

        {/* Sets progress dots */}
        <div className="flex justify-center gap-2">
          {Array.from({ length: ex.sets }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-colors ${
                i < currentSet - 1
                  ? "bg-primary"
                  : i === currentSet - 1
                  ? "bg-primary/50 ring-2 ring-primary/30"
                  : "bg-border"
              }`}
            />
          ))}
        </div>
      </div>
    </ClientPortalLayout>
  );
};

export default PortalWorkout;
