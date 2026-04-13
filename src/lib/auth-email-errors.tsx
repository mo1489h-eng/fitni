import { Link } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";

export function isEmailAlreadyRegisteredError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("already registered") ||
    m.includes("already been registered") ||
    m.includes("user already registered") ||
    m.includes("email address is already registered") ||
    m.includes("email already exists") ||
    m.includes("duplicate key") ||
    m.includes("already exists")
  );
}

/** Toast content when Supabase reports the email is already registered. */
export async function duplicateEmailToastContent(email: string, options?: { preferClientLogin?: boolean }) {
  const preferClient = options?.preferClientLogin ?? false;
  const { data, error } = await supabase.rpc("check_email_account_type", {
    p_email: email.trim().toLowerCase(),
  });

  const base = (
    <>
      هذا البريد الإلكتروني مستخدم مسبقاً، يرجى تسجيل الدخول أو استخدام بريد آخر.{" "}
      <Link to={preferClient ? "/client-login" : "/login"} className="underline font-semibold text-primary">
        تسجيل الدخول
      </Link>
    </>
  );

  if (error) {
    return { title: "البريد مستخدم مسبقاً", description: base };
  }

  switch (String(data)) {
    case "trainer":
      return {
        title: "البريد مستخدم مسبقاً",
        description: (
          <>
            هذا البريد مسجل كمدرب.{" "}
            <Link to="/login" className="underline font-semibold text-primary">
              تسجيل الدخول
            </Link>
            {" أو استخدم بريداً آخر."}
          </>
        ),
      };
    case "client":
      return {
        title: "البريد مستخدم مسبقاً",
        description: (
          <>
            هذا البريد مسجل كمتدرب، تواصل مع مدربك.{" "}
            <Link to="/client-login" className="underline font-semibold text-primary">
              تسجيل الدخول كمتدرب
            </Link>
          </>
        ),
      };
    case "both":
      return {
        title: "البريد مستخدم مسبقاً",
        description: (
          <>
            هذا البريد مسجل كمدرب وكمتدرب.{" "}
            <Link to="/login" className="underline font-semibold text-primary">
              دخول المدرب
            </Link>
            {" · "}
            <Link to="/client-login" className="underline font-semibold text-primary">
              دخول المتدرب
            </Link>
          </>
        ),
      };
    default:
      return { title: "البريد مستخدم مسبقاً", description: base };
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
  return isEmailAlreadyRegisteredError(m) || m.includes("already") || m.includes("duplicate");
}
