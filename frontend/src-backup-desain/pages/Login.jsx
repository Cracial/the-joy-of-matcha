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
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        {/* HEADER */}
        <div className="mb-8 text-center">
          <div className="mb-3 text-4xl">
            🍵
          </div>

          <h1 className="text-3xl font-bold text-green-700">
            The Joy of Matcha
          </h1>

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
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
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
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-green-700 px-4 py-3 font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-gray-400"
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