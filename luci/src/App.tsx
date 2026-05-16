/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { auth } from "./firebase";
import { onAuthStateChanged, User } from "firebase/auth";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Appointments from "./pages/Appointments";
import Finance from "./pages/Finance";
import Inventory from "./pages/Inventory";
import Services from "./pages/Services";
import LuciCreator from "./pages/LuciCreator";
import ProLuci3D from "./pages/ProLuci3D";
import SettingsPage from "./pages/Settings";
import Layout from "./components/Layout";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--accent)]"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={!user ? <Login /> : <Navigate to="/" />}
        />
        <Route
          path="/register"
          element={!user ? <Register /> : <Navigate to="/" />}
        />
        <Route
          path="/forgot-password"
          element={!user ? <ForgotPassword /> : <Navigate to="/" />}
        />

        {/* Protected Routes */}
        <Route element={user ? <Layout /> : <Navigate to="/login" />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/services" element={<Services />} />
          <Route path="/settings" element={<SettingsPage />} />
          {/* <Route path="/luci-creator" element={<LuciCreator />} /> */}
          {/* <Route path="/proluci-3d" element={<ProLuci3D />} /> */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
