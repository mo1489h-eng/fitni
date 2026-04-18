import { useMemo, useState, useEffect, useId } from "react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";

type SparkPoint = Record<string, number>;

export function PremiumStatCard({
  label,
  value,
  suffix,
  sublabel,
  sparklineData,
  dataKey,
  trendPct,
  loading,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  sublabel?: string;
  sparklineData: SparkPoint[];
  dataKey: string;
  trendPct: number | null;
  loading?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const gradId = useId().replace(/:/g, "");
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const positive = trendPct != null && trendPct >= 0;

  const chartData = useMemo(() => sparklineData.map((row, i) => ({ ...row, _i: i })), [sparklineData]);

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[rgba(255,255,255,0.03)] p-6 shadow-sm backdrop-blur-md transition-all duration-300 ease-out hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-[0_25px_80px_-20px_rgba(0,0,0,0.65)]"
      style={{
        boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.04)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: "linear-gradient(135deg, rgba(79,111,82,0.12) 0%, rgba(59,130,246,0.1) 50%, transparent 70%)",
          padding: 1,
        }}
      />
      <div className="relative border border-transparent group-hover:border-transparent">
        {loading ? (
          <div className="analytics-shimmer h-[120px] rounded-lg" />
        ) : (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6b7280]">{label}</p>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <p
                className="text-[42px] font-bold leading-none tracking-tight text-white tabular-nums md:text-[48px]"
                style={{ fontFeatureSettings: '"tnum"' }}
              >
                {mounted ? value : "—"}
                {suffix ? <span className="mr-1.5 text-xl font-semibold text-[#d1d5db] md:text-2xl">{suffix}</span> : null}
              </p>
              {trendPct != null && !Number.isNaN(trendPct) ? (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
                    positive ? "bg-primary/15 text-primary" : "bg-red-500/15 text-red-400"
                  }`}
                >
                  {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {positive ? "+" : ""}
                  {trendPct}%
                </span>
              ) : null}
            </div>
            {sublabel ? <p className="mt-2 text-xs text-[#6b7280]">{sublabel}</p> : null}
            <div className="mt-4 h-10 w-full opacity-90" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f6f52" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#4f6f52" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <YAxis hide domain={["dataMin", "dataMax"]} />
                  <Area
                    type="monotone"
                    dataKey={dataKey}
                    stroke="#4f6f52"
                    strokeWidth={1.5}
                    fill={`url(#${gradId})`}
                    isAnimationActive
                    animationDuration={1000}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
