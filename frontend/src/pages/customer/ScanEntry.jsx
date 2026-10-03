/* ==========================================================================
   ScanEntry.jsx — the page a table's QR code opens (/t/:tableCode).
   The guest goes straight to the menu: no form first. Name, phone and the
   location check come when the first order is sent (Cart.jsx). If this
   browser already has a session at the table, the menu continues with it.
   ========================================================================== */
import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { tableSession } from "../../utils/tableSession";

export default function ScanEntry() {
  const { tableCode } = useParams();
  const session = tableSession(tableCode);
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return <Navigate replace to={`/t/${tableCode}/menu${session ? `?session=${encodeURIComponent(session)}` : ""}`} />;
}
