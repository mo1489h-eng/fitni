import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

interface DayData {
  day: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface NutritionDayChartProps {
  data: DayData[];
  target?: number;
}

const DAYS_AR = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

const NutritionDayChart = ({ data, target }: NutritionDayChartProps) => {
  const chartData = data.map(d => ({
    ...d,
    label: DAYS_AR[new Date(d.day).getDay()] || d.day,
    fill: target
      ? d.calories >= target * 0.8 && d.calories <= target * 1.1
        ? "hsl(125 17% 37%)"
        : d.calories > target * 1.2
          ? "hsl(0 84% 60%)"
          : "hsl(45 93% 47%)"
      : "hsl(125 17% 37%)",
  }));

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 12%)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "hsl(0 0% 40%)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "hsl(0 0% 30%)", fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: "hsl(0 0% 6%)", border: "1px solid hsl(0 0% 15%)", borderRadius: 8, direction: "rtl" }}
            labelStyle={{ color: "hsl(0 0% 70%)", fontSize: 12 }}
            formatter={(value: number) => [`${value} سعرة`, "السعرات"]}
          />
          <Bar dataKey="calories" radius={[4, 4, 0, 0]} maxBarSize={32}
            fill="hsl(125 17% 37%)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default NutritionDayChart;
