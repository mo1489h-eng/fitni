import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Use `<a>` in toast copy — toasts mount outside the route tree in some layouts; `<Link>` requires Router context. */
function ToastAuthLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <a href={to} className="font-semibold text-primary underline">
      {children}
    </a>
  );
}

export function isEmailAlreadyRegisteredError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("already registered") ||
    m.includes("already been registered") ||
    m.includes("user already registered") ||
    m.includes("email address is already registered") ||
    m.includes("email already exists") ||
    m.includes("duplicate key") ||
    m.includes("already exists") ||
    m.includes("database error saving new user")
  );
}

/** Toast content when signup fails because the email is already taken. */
export async function duplicateEmailToastContent(email: string, options?: { preferClientLogin?: boolean }) {
  const preferClient = options?.preferClientLogin ?? false;
  const { data, error } = await supabase.rpc("check_email_account_type" as any, {
    p_email: email.trim().toLowerCase(),
  });

  const unknown = (
    <>
      هذا البريد مستخدم مسبقاً.{" "}
      <ToastAuthLink to={preferClient ? "/client-login" : "/login"}>سجّل دخولك من هنا</ToastAuthLink>
    </>
  );

  if (error) {
    return { title: "البريد مستخدم مسبقاً", description: unknown };
  }

  switch (String(data)) {
    case "trainer":
      return {
        title: "البريد مستخدم مسبقاً",
        description: (
          <>
            هذا البريد مسجل كمدرب، <ToastAuthLink to="/login">سجّل دخولك من هنا</ToastAuthLink>
          </>
        ),
      };
    case "client":
      return {
        title: "البريد مستخدم مسبقاً",
        description: (
          <>
            هذا البريد مسجل كمتدرب، تواصل مع مدربك. <ToastAuthLink to="/client-login">سجّل دخولك من هنا</ToastAuthLink>
          </>
        ),
      };
    case "both":
      return {
        title: "البريد مستخدم مسبقاً",
        description: (
          <>
            هذا البريد مسجّل كمدرب وكمتدرب. <ToastAuthLink to="/login">دخول المدرب</ToastAuthLink>
            {" · "}
            <ToastAuthLink to="/client-login">دخول المتدرب</ToastAuthLink>
          </>
        ),
      };
    default:
      return { title: "البريد مستخدم مسبقاً", description: unknown };
  }
}

export function clientRegistrationLooksLikeDuplicate(code?: string, message?: string): boolean {
  const m = (message ?? "").toLowerCase();
  if (code === "USER_EXISTS") return true;
  if (
    code === "AUTH_CREATE_FAILED" &&
    (isEmailAlreadyRegisteredError(m) || m.includes("already") || m.includes("duplicate"))
  ) {
    return true;
  }
  return isEmailAlreadyRegisteredError(m) || m.includes("already") || m.includes("duplicate") || m.includes("مسجل");
}
