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

export default function App() {
  return (
    <Routes>
    
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />


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

   
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}