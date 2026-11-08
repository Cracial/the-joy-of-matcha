import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import AdminLayout from "./components/AdminLayout";
import AdminRoute from "./components/AdminRoute";

import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Review from "./pages/Review";
import Payment from "./pages/Payment";
import TrackOrder from "./pages/TrackOrder";
import About from "./pages/About";
import ChatWidget from "./components/ChatWidget";
import Footer from "./components/Footer";

import Login from "./pages/Login";

import AdminPayments from "./pages/AdminPayments";
import AdminOrders from "./pages/AdminOrders";
import AdminProducts from "./pages/AdminProducts";

function CustomerLayout() {
  return (
    <div className="joy-customer flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      <ChatWidget />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route
            path="/products/:id"
            element={<ProductDetail />}
          />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/review" element={<Review />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/payment-success" element={<Navigate to="/track" replace />} />
          <Route path="/orders" element={<Navigate to="/track" replace />} />
          <Route path="/payments" element={<Navigate to="/track" replace />} />
          <Route path="/register" element={<Navigate to="/products" replace />} />
          <Route path="/track" element={<TrackOrder />} />
          <Route path="/track/:id" element={<TrackOrder />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* AUTH */}
        <Route path="/login" element={<Login />} />

        {/* ADMIN */}
        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route
              path="/admin"
              element={<AdminOrders />}
            />

            <Route
              path="/admin/orders"
              element={<AdminOrders />}
            />

            <Route
              path="/admin/payments"
              element={<AdminPayments />}
            />
            <Route path="/admin/products" element={<AdminProducts />} />
          </Route>
        </Route>

        {/* CUSTOMER */}
        <Route path="*" element={<CustomerLayout />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;