import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, Plus, Flame, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface FoodItem {
  id: string;
  name_ar: string;
  name_en: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  serving_size_default: number;
  serving_unit: string;
  category: string;
  source: string;
}

interface FoodSearchProps {
  onSelect: (food: FoodItem) => void;
  onCustomAdd?: () => void;
  placeholder?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  "وجبات خليجية": "hsl(35 90% 55%)",
  "أساسيات": "hsl(220 70% 55%)",
  "بروتينات": "hsl(0 70% 55%)",
  "عالمية": "hsl(280 60% 55%)",
  "سناكات": "hsl(160 60% 45%)",
  "فواكه": "hsl(100 60% 45%)",
  "خضروات": "hsl(142 71% 45%)",
  "مشروبات": "hsl(200 70% 55%)",
};

const FoodSearch = ({ onSelect, onCustomAdd, placeholder = "ابحث عن طعام..." }: FoodSearchProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("food_database" as any)
      .select("*")
      .or(`name_ar.ilike.%${q}%,name_en.ilike.%${q}%`)
      .limit(15);
    setResults((data || []) as unknown as FoodItem[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder={placeholder}
          className="pr-10 h-12 text-base bg-card border-border"
        />
        {query && (
          <button onClick={() => { setQuery(""); setResults([]); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {focused && (query.length >= 2 || results.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-2xl max-h-80 overflow-y-auto">
          {loading && <div className="p-4 text-center text-sm text-muted-foreground">جاري البحث...</div>}
          
          {!loading && results.length === 0 && query.length >= 2 && (
            <div className="p-4 text-center space-y-2">
              <p className="text-sm text-muted-foreground">لم يتم العثور على نتائج</p>
              {onCustomAdd && (
                <Button size="sm" variant="outline" onClick={onCustomAdd} className="gap-1">
                  <Plus className="w-3 h-3" /> أضف طعام جديد
                </Button>
              )}
            </div>
          )}

          {results.map(food => (
            <button
              key={food.id}
              onMouseDown={() => { onSelect(food); setQuery(""); setResults([]); }}
              className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-right border-b border-border/50 last:border-0"
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${CATEGORY_COLORS[food.category] || "hsl(0 0% 15%)"}20` }}>
                <Flame className="w-4 h-4" style={{ color: CATEGORY_COLORS[food.category] || "hsl(0 0% 40%)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{food.name_ar}</p>
                <p className="text-xs text-muted-foreground">{food.calories_per_100g} سعرة / 100g</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                  P:{food.protein_per_100g}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
                  C:{food.carbs_per_100g}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400">
                  F:{food.fat_per_100g}
                </span>
              </div>
            </button>
          ))}

          {!loading && results.length > 0 && onCustomAdd && (
            <button
              onMouseDown={onCustomAdd}
              className="w-full flex items-center justify-center gap-2 p-3 text-primary hover:bg-muted/50 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> أضف طعام جديد
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FoodSearch;
