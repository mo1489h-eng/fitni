import { MessageCircle } from "lucide-react";

const ClientMobileChat = () => {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-white">المحادثة</h1>
      <div className="rounded-2xl p-8 text-center" style={{ background: "#111111" }}>
        <MessageCircle className="mx-auto mb-3 h-10 w-10" style={{ color: "#333" }} strokeWidth={1.5} />
        <p className="text-sm" style={{ color: "#666" }}>
          المحادثة مع المدرب ستظهر هنا
        </p>
      </div>
    </div>
  );
};

export default ClientMobileChat;
