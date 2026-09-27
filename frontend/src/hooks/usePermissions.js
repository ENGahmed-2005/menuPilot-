/* ==========================================================================
   usePermissions — UX-level permission checks.
     const { can, canAny } = usePermissions();
     can("close_session")
   Hiding a button is not security: the Laravel API checks the same
   permission on every request (permission: middleware).
   ========================================================================== */
import { useAuth } from "../context/AuthContext";

export function usePermissions() {
  const { can, permissions, role } = useAuth();
  const canAny = (...list) => list.flat().some((p) => can(p));
  return { can, canAny, permissions, role };
}
