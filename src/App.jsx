import { Routes, Route, Navigate } from "react-router-dom";

import AdminLayout from "./Component/layout/AdminLayout";
import ProtectedRoute from "./routes/ProtectedRoute";

import Login from "./auth/login";
import Register from "./auth/register";

import Dashboard from "./pages/admin/Dashboard";
import Users from "./pages/admin/Users";
import Sellers from "./pages/admin/Sellers";
import Products from "./pages/admin/Products";
import Categories from "./pages/admin/Categories";
import Subcategories from "./pages/admin/Subcategories";
import Brands from "./pages/admin/Brands";
import Attributes from "./pages/admin/Attributes";
import Orders from "./pages/admin/Orders";
import Reviews from "./pages/admin/Reviews";
import Settings from "./pages/admin/Settings";
import SellerLayout from "./Component/layout/SellerLayout";
import SellerDashboard from "./pages/seller/Dashboard";
import SellerProducts from "./pages/seller/Products";
import SellerOrders from "./pages/seller/Orders";
import CustomerLayout from "./Component/layout/CustomerLayout";
import Store from "./pages/customer/Store";
import ProductDetails from "./pages/customer/ProductDetails";
import Cart from "./pages/customer/Cart";
import Wishlist from "./pages/customer/Wishlist";
import CustomerOrders from "./pages/customer/Orders";
import Account from "./pages/customer/Account";
import Invoice from "./pages/customer/Invoice";
import Messages from "./pages/customer/Messages";
import BecomeSeller from "./pages/customer/BecomeSeller";

export default function App() {
  return (
    <Routes>
      <Route element={<CustomerLayout />}>
        <Route index element={<Store />} />
        <Route path="product/:id" element={<ProductDetails />} />
      </Route>

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute allowedRoles={["customer"]} />}>
        <Route element={<CustomerLayout />}>
          <Route path="/account" element={<Account />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/orders" element={<CustomerOrders />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/become-seller" element={<BecomeSeller />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="sellers" element={<Sellers />} />
          <Route path="products" element={<Products />} />
          <Route path="categories" element={<Categories />} />
          <Route path="subcategories" element={<Subcategories />} />
          <Route path="brands" element={<Brands />} />
          <Route path="attributes" element={<Attributes />} />
          <Route path="orders" element={<Orders />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["seller"]} />}>
        <Route path="/seller" element={<SellerLayout />}>
          <Route index element={<SellerDashboard />} />
          <Route path="products" element={<SellerProducts />} />
          <Route path="orders" element={<SellerOrders />} />
          <Route path="messages" element={<Messages />} />
          <Route path="orders/:orderId/invoice" element={<Invoice />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}