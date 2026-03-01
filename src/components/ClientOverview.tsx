import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users, MessageCircle, Eye, TrendingUp, TrendingDown, Minus,
  ArrowDownAZ,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Client {
  id: string;
  name: string;
  phone: string;
  last_workout_date: string;
  subscription_end_date: string;
  subscription_price: number;
  week_number: number;
  goal: string;
}

interface Measurement {
  client_id: string;
  weight: number;
  recorded_at: string;
}

interface ClientOverviewProps {
  clients: Client[];
  measurements: Measurement[];
}

type SortKey = "commitment" | "expiring" | "payment";

const ClientOverview = ({ clients, measurements }: ClientOverviewProps) => {
  const [sortBy, setSortBy] = useState<SortKey>("commitment");

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 86400000;

  const getClientData = (client: Client) => {
    const lastWorkoutDays = Math.ceil((now - new Date(client.last_workout_date).getTime()) / 86400000);

    // Commitment: simplified as inverse of days since last workout (active = good)
    const commitmentPercent = Math.max(0, Math.min(100, Math.round((1 - Math.min(lastWorkoutDays, 7) / 7) * 100)));

    // Weight change this month
    const clientMeasurements = measurements
      .filter((m) => m.client_id === client.id)
      .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());

    const recentMeasurements = clientMeasurements.filter(
      (m) => new Date(m.recorded_at).getTime() >= thirtyDaysAgo
    );
    const latestWeight = clientMeasurements[0]?.weight || 0;
    const oldestThisMonth = recentMeasurements.length > 1 ? recentMeasurements[recentMeasurements.length - 1]?.weight : latestWeight;
    const weightChange = latestWeight && oldestThisMonth ? Number((latestWeight - oldestThisMonth).toFixed(1)) : 0;

    // Payment
    const daysUntilEnd = Math.ceil((new Date(client.subscription_end_date).getTime() - now) / 86400000);
    const isPaid = daysUntilEnd >= 0;

    return { lastWorkoutDays, commitmentPercent, weightChange, daysUntilEnd, isPaid };
  };

  const sortedClients = [...clients].sort((a, b) => {
    const da = getClientData(a);
    const db = getClientData(b);
    if (sortBy === "commitment") return da.commitmentPercent - db.commitmentPercent;
    if (sortBy === "expiring") return da.daysUntilEnd - db.daysUntilEnd;
    // payment: overdue first
    return (da.isPaid ? 1 : 0) - (db.isPaid ? 1 : 0);
  });

  const formatWhatsApp = (phone: string | undefined) =>
    `https://wa.me/966${(phone || "").replace(/^0/, "")}`;

  const getCommitmentColor = (percent: number) => {
    if (percent >= 80) return "text-success bg-success/10";
    if (percent >= 50) return "text-warning bg-warning/10";
    return "text-destructive bg-destructive/10";
  };

  if (clients.length === 0) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-card-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          نظرة سريعة على عملاءك
        </h3>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <ArrowDownAZ className="w-3.5 h-3.5 ml-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="commitment">الأقل التزاماً</SelectItem>
            <SelectItem value="expiring">الأقرب للانتهاء</SelectItem>
            <SelectItem value="payment">المتأخرون بالدفع</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {sortedClients.map((client) => {
          const d = getClientData(client);
          const initials = client.name.split(" ").map((w) => w[0]).join("").slice(0, 2);
          const WeightIcon = d.weightChange < 0 ? TrendingDown : d.weightChange > 0 ? TrendingUp : Minus;
          const weightColor = d.weightChange < 0 ? "text-success" : d.weightChange > 0 ? "text-destructive" : "text-muted-foreground";

          return (
            <div key={client.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">{initials}</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-card-foreground truncate">{client.name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {/* Commitment */}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getCommitmentColor(d.commitmentPercent)}`}>
                    {d.commitmentPercent}%
                  </span>
                  {/* Last workout */}
                  <span className="text-[10px] text-muted-foreground">
                    آخر تمرين: {d.lastWorkoutDays === 0 ? "اليوم" : `${d.lastWorkoutDays} يوم`}
                  </span>
                  {/* Weight */}
                  {d.weightChange !== 0 && (
                    <span className={`text-[10px] flex items-center gap-0.5 ${weightColor}`}>
                      <WeightIcon className="w-3 h-3" />
                      {Math.abs(d.weightChange)}كجم
                    </span>
                  )}
                </div>
              </div>

              {/* Payment + days left */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  d.isPaid ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                }`}>
                  {d.isPaid ? "مدفوع" : "متأخر"}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {d.daysUntilEnd < 0 ? "منتهي" : `${d.daysUntilEnd} يوم`}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-1 flex-shrink-0">
                <a href={formatWhatsApp(client.phone)} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-success hover:text-success">
                    <MessageCircle className="w-3.5 h-3.5" />
                  </Button>
                </a>
                <Link to={`/clients/${client.id}`}>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-primary hover:text-primary">
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default ClientOverview;
