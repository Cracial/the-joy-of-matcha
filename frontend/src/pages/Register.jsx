import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] =
    useState(false);

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]:
        event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);

      await axios.post(
        `${API}/api/auth/register`,
        form
      );

      alert(
        "Registrasi berhasil. Silakan login."
      );

      navigate("/login");
    } catch (error) {
      console.error(
        "Register error:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Registrasi gagal."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md px-6 py-12">
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">
          Buat Akun
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Daftar untuk mulai menggunakan The Joy of Matcha.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5"
        >
          <div>
            <label className="text-sm font-medium text-gray-700">
              Nama
            </label>

            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Nama kamu"
              required
              className="mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:border-green-600"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Email
            </label>

            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="nama@email.com"
              required
              className="mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:border-green-600"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Password
            </label>

            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Minimal 6 karakter"
              required
              minLength={6}
              className="mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:border-green-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-green-700 px-4 py-3 font-medium text-white hover:bg-green-800 disabled:opacity-50"
          >
            {loading
              ? "Mendaftarkan..."
              : "Daftar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Sudah punya akun?{" "}
          <Link
            to="/login"
            className="font-medium text-green-700 hover:underline"
          >
            Login
          </Link>
        </p>
      </div>
    </section>
  );
}

export default Register;