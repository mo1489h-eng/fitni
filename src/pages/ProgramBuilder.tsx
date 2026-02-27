import { useState } from "react";
import TrainerLayout from "@/components/TrainerLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockPrograms, mockProgramDays, mockExercises, exerciseLibrary, mockClients } from "@/lib/mockData";
import { Plus, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProgramDay, Exercise } from "@/lib/mockData";

const ProgramBuilder = () => {
  const [selectedProgram, setSelectedProgram] = useState(mockPrograms[0]?.id || "");
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [newExerciseName, setNewExerciseName] = useState("");

  const program = mockPrograms.find((p) => p.id === selectedProgram);
  const days = mockProgramDays.filter((d) => d.program_id === selectedProgram);

  const getExercisesForDay = (dayId: string) =>
    mockExercises.filter((e) => e.day_id === dayId);

  return (
    <TrainerLayout>
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">بناء البرامج</h1>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 ml-1" />
                برنامج جديد
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إنشاء برنامج جديد</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input placeholder="اسم البرنامج" />
                <Input placeholder="عدد الأسابيع" type="number" dir="ltr" />
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="تخصيص لعميل (اختياري)" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockClients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button className="w-full">إنشاء</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Program Selector */}
        <Select value={selectedProgram} onValueChange={setSelectedProgram}>
          <SelectTrigger>
            <SelectValue placeholder="اختر برنامج" />
          </SelectTrigger>
          <SelectContent>
            {mockPrograms.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {program && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{program.weeks} أسابيع</p>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 ml-1" />
                إضافة يوم
              </Button>
            </div>

            {/* Days */}
            <div className="space-y-3">
              {days.map((day) => {
                const exercises = getExercisesForDay(day.id);
                const isExpanded = expandedDay === day.id;

                return (
                  <Card key={day.id} className="overflow-hidden">
                    <button
                      onClick={() => setExpandedDay(isExpanded ? null : day.id)}
                      className="w-full flex items-center justify-between p-4 text-right"
                    >
                      <div>
                        <h3 className="font-bold text-card-foreground">اليوم {day.day_number}</h3>
                        <p className="text-sm text-muted-foreground">{day.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{exercises.length} تمارين</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border p-4 space-y-3">
                        {exercises.map((ex) => (
                          <div key={ex.id} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                            <div>
                              <p className="font-medium text-secondary-foreground">{ex.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {ex.sets} مجموعات × {ex.reps} تكرار
                                {ex.target_weight > 0 && ` • ${ex.target_weight} كجم`}
                              </p>
                            </div>
                            <button className="text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}

                        {/* Add Exercise */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full">
                              <Plus className="w-4 h-4 ml-1" />
                              إضافة تمرين
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>إضافة تمرين</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3">
                              <Select onValueChange={setNewExerciseName}>
                                <SelectTrigger>
                                  <SelectValue placeholder="اختر تمرين" />
                                </SelectTrigger>
                                <SelectContent>
                                  {exerciseLibrary.map((name) => (
                                    <SelectItem key={name} value={name}>{name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="text-xs text-muted-foreground">مجموعات</label>
                                  <Input type="number" defaultValue={3} dir="ltr" />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">تكرارات</label>
                                  <Input type="number" defaultValue={10} dir="ltr" />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">الوزن (كجم)</label>
                                  <Input type="number" defaultValue={0} dir="ltr" />
                                </div>
                              </div>
                              <Button className="w-full">إضافة</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </TrainerLayout>
  );
};

export default ProgramBuilder;
