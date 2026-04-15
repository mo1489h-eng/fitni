import type { ComponentType } from "react";
import type { FitniRole } from "@/lib/auth-service";
import { RoleGuard } from "./RoleGuard";

/** HOC: wrap a route element so only the given Fitni role can render it */
export function withRoleRequired<P extends object>(Wrapped: ComponentType<P>, allowed: FitniRole) {
  const displayName = Wrapped.displayName || Wrapped.name || "Component";

  function RoleRequired(props: P) {
    return (
      <RoleGuard allowed={allowed}>
        <Wrapped {...props} />
      </RoleGuard>
    );
  }

  RoleRequired.displayName = `withRoleRequired(${displayName})`;
  return RoleRequired;
}
