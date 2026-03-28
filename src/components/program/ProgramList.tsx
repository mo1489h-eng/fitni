import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus, Search, ArrowRight, Calendar, Users, Dumbbell, Trash2, ClipboardList, Loader2, Flame,
} from "lucide-react";

interface Props {
  programs: any[];
  clients: any[];
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onNewProgram: () => void;
  onViewProgram: (id: string) => void;
  onAssignProgram: (id: string) => void;
  onDeleteProgram: (id: string) => void;
  onApplyTemplate: (t: any) => void;
  templates: any[];
}

const ProgramList = ({
  programs, clients, isLoading, searchQuery, setSearchQuery,
  onNewProgram, onViewProgram, onAssignProgram, onDeleteProgram,
  onApplyTemplate, templates,
}: Props) => {
  const getClientCount = (pid: string) => clients.filter((c: any) => c.program_id === pid).length;

  const filteredPrograms = searchQuery
    ? programs.filter(p => p.name.includes(searchQuery))
    : programs;

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">البرامج التدريبية</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{programs.length} برنامج</p>
        </div>
        <Button size="sm" onClick={onNewProgram} className="gap-1">
          <Plus className="w-4 h-4" strokeWidth={1.5} />برنامج جديد
        </Button>
      </div>

      {/* Search */}
      {programs.length > 3 && (
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
          <Input placeholder="ابحث في البرامج..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)} className="pr-10" />
        </div>
      )}

      {/* Templates */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-2.5 flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-primary" strokeWidth={1.5} />قوالب جاهزة
        </h3>
        <div data-tour="program-templates" className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1">
          {templates.map((t: any) => (
            <button key={t.name} onClick={() => onApplyTemplate(t)}
              className="flex-shrink-0 w-44 rounded-xl border border-border p-3.5 text-right hover:border-primary/50 hover:bg-primary/[0.03] transition-all group">
              <t.icon className="w-5 h-5 text-primary mb-1.5" strokeWidth={1.5} />
              <p className="text-xs font-bold text-foreground leading-tight">{t.name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</p>
              <div className="flex gap-1.5 mt-2 text-[9px] text-muted-foreground">
                <span>{t.weeks} أسابيع</span><span>|</span>
                <span>{t.days.filter((d: any) => !d.isRest).length} أيام</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Programs Grid */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-2.5">برامجك</h3>
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : filteredPrograms.length === 0 && !searchQuery ? (
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <ClipboardList className="w-8 h-8 text-primary" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-bold text-foreground">لم تبنِ برامج بعد</h3>
            <p className="text-sm text-muted-foreground">استخدم قالب جاهز أو ابنِ من الصفر</p>
            <Button onClick={onNewProgram} className="gap-1"><Plus className="w-4 h-4" strokeWidth={1.5} />برنامج جديد</Button>
          </div>
        ) : filteredPrograms.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">لا توجد نتائج</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredPrograms.map((program: any) => {
              const clientCount = getClientCount(program.id);
              const isTemplate = program.is_template;
              return (
                <Card key={program.id}
                  className={`p-4 hover:shadow-md transition-all cursor-pointer group ${isTemplate ? 'border-r-2 border-r-amber-500/50' : ''}`}
                  onClick={() => onViewProgram(program.id)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-card-foreground group-hover:text-primary transition-colors">{program.name}</h3>
                      {isTemplate && <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[8px]">قالب</Badge>}
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" strokeWidth={1.5} />
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="secondary" className="text-[10px]"><Calendar className="w-3 h-3 ml-0.5" strokeWidth={1.5} />{program.weeks} أسابيع</Badge>
                    <Badge variant="secondary" className="text-[10px]"><Users className="w-3 h-3 ml-0.5" strokeWidth={1.5} />{clientCount} متدرب</Badge>
                    {program.goal && <Badge variant="secondary" className="text-[10px]">{program.goal}</Badge>}
                    {program.difficulty && <Badge variant="secondary" className="text-[10px]">{program.difficulty}</Badge>}
                  </div>
                  <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" className="text-[10px] h-7 flex-1 gap-0.5"
                      onClick={e => { e.stopPropagation(); onViewProgram(program.id); }}>تعديل</Button>
                    <Button variant="outline" size="sm" className="text-[10px] h-7 flex-1 gap-0.5"
                      onClick={e => { e.stopPropagation(); onAssignProgram(program.id); }}>
                      <Users className="w-3 h-3" strokeWidth={1.5} />تعيين
                    </Button>
                    <Button variant="outline" size="sm" className="text-[10px] h-7 text-destructive gap-0.5"
                      onClick={e => { e.stopPropagation(); onDeleteProgram(program.id); }}>
                      <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgramList;
