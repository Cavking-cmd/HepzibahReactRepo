import { Navigate } from "react-router-dom";

/**
 * The Pastor login role has been retired. Pastors are now name records chosen
 * when creating services (Pastors section for Admin and Attendance Officers).
 * This file is kept only so old imports do not break; it is no longer routed.
 */
export default function PastorDashboard() {
  return <Navigate to="/login" replace />;
}
