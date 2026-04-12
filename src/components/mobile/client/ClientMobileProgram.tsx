import { Dumbbell } from "lucide-react";

const ClientMobileProgram = () => {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-white">برنامجي</h1>
      <div className="rounded-2xl p-8 text-center" style={{ background: "#111111" }}>
        <Dumbbell className="mx-auto mb-3 h-10 w-10" style={{ color: "#333" }} strokeWidth={1.5} />
        <p className="text-sm" style={{ color: "#666" }}>
          برنامج التمرين والتغذية الخاص بك سيظهر هنا
        </p>
      </div>
    </div>
  );
};

export default ClientMobileProgram;
