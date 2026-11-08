import { Navigate, Outlet } from "react-router-dom";

function AdminRoute() {
  const token = sessionStorage.getItem("token");
  const userData = sessionStorage.getItem("user");

  if (!token || !userData) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userData);

    if (user.role !== "ADMIN") {
      return <Navigate to="/orders" replace />;
    }

    return <Outlet />;
  } catch (error) {
    console.error("Data user tidak valid:", error);

    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

    return <Navigate to="/login" replace />;
  }
}

export default AdminRoute;