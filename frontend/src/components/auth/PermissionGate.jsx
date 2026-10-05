/* ==========================================================================
   PermissionGate — render children only when the user holds a permission.
     <PermissionGate permission="close_session">…</PermissionGate>
     <PermissionGate anyOf={["record_payment", "close_session"]} fallback={…}>
   UX only; the API is the real guard.
   ========================================================================== */
import { usePermissions } from "../../hooks/usePermissions";

export default function PermissionGate({ permission, anyOf, fallback = null, children }) {
  const { can, canAny } = usePermissions();
  const allowed = anyOf ? canAny(anyOf) : can(permission);
  return allowed ? children : fallback;
}
