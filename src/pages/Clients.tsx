import { useState } from "react";
import { Link } from "react-router-dom";
import TrainerLayout from "@/components/TrainerLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockClients, getClientPaymentStatus } from "@/lib/mockData";
import { Plus, Search, Target } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const statusColors = {
  active: "border-r-4 border-r-success",
  overdue: "border-r-4 border-r-destructive",
  expiring: "border-r-4 border-r-warning",
};

const statusLabels = {
  active: "نشط",
  overdue: "متأخر",
  expiring: "ينتهي قريباً",
};

const statusBadgeColors = {
  active: "bg-success/10 text-success",
  overdue: "bg-destructive/10 text-destructive",
  expiring: "bg-warning/10 text-warning",
};

const Clients = () => {
  const [search, setSearch] = useState("");
  const filtered = mockClients.filter((c) =>
    c.name.includes(search) || c.goal.includes(search)
  );

  return (
    <TrainerLayout>
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">العملاء</h1>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 ml-1" />
                إضافة عميل
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إضافة عميل جديد</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input placeholder="اسم العميل" />
                <Input placeholder="رقم الجوال" type="tel" dir="ltr" />
                <Input placeholder="الهدف (مثال: خسارة وزن)" />
                <Input placeholder="سعر الاشتراك (ر.س)" type="number" dir="ltr" />
                <Button className="w-full">حفظ</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث عن عميل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* Client Cards */}
        <div className="space-y-3">
          {filtered.map((client) => {
            const status = getClientPaymentStatus(client);
            return (
              <Link to={`/clients/${client.id}`} key={client.id}>
                <Card className={`p-4 hover:shadow-md transition-shadow ${statusColors[status]}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-card-foreground">{client.name}</h3>
                      <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                        <Target className="w-3 h-3" />
                        {client.goal}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        الأسبوع {client.week_number}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadgeColors[status]}`}>
                      {statusLabels[status]}
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </TrainerLayout>
  );
};

export default Clients;
