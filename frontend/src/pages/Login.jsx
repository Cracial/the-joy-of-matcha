import BrandLogo from "../components/BrandLogo";
import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${API}/api/auth/login`,
        {
          email: form.email,
          password: form.password,
        }
      );

      const { token, user } = response.data.data;

      sessionStorage.setItem("token", token);
      sessionStorage.setItem(
        "user",
        JSON.stringify(user)
      );

      window.dispatchEvent(new Event("matchaku:auth-changed"));

      // ADMIN masuk ke halaman admin
      if (user.role === "ADMIN") {
        navigate("/admin/orders");
      }

      else {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
        setError("Halaman ini hanya untuk admin. Customer dapat langsung berbelanja.");
      }
    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Email atau password salah."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="joy-login flex min-h-screen items-center justify-center px-5 py-12">
      <div className="joy-login-panel w-full max-w-md p-8 sm:p-10">
        {/* HEADER */}
        <div className="mb-8 text-center">
          <BrandLogo variant="login" className="mx-auto" />
          <h1 className="sr-only">The Joy of Matcha — Login Admin</h1>

          <p className="mt-2 text-sm text-gray-500">
            Login khusus administrator
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Email
            </label>

            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Masukkan email"
              required
              className="joy-login-input w-full"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Password
            </label>

            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Masukkan password"
              required
              className="joy-login-input w-full"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="joy-login-button w-full"
          >
            {loading
              ? "Memproses..."
              : "Masuk"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Customer tidak perlu login. <Link to="/products" className="font-semibold text-green-700 hover:underline">Lihat katalog</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;