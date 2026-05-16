import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Calendar,
  Users,
  List,
  DollarSign,
  Settings,
  LogOut,
  Sparkles,
  Layers,
  Package
} from "lucide-react";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const navItems = [
    { to: "/", icon: Calendar, label: "Início" },
    { to: "/clients", icon: Users, label: "Clientes" },
    { to: "/appointments", icon: List, label: "Agenda" },
    { to: "/finance", icon: DollarSign, label: "Financeiro" },
    { to: "/inventory", icon: Package, label: "Estoque" },
    { to: "/services", icon: Layers, label: "Serviços" },
    { to: "/settings", icon: Settings, label: "Config." },
  ];

  return (
    <div className="min-h-screen text-main font-sans pb-[90px] md:pb-0 md:pl-[280px] md:p-6 bg-[#FBFBFD]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col fixed inset-y-6 left-6 w-[240px] bg-white/70 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-[32px] z-50 p-6">
        <div className="flex items-center justify-center mb-8 pt-4">
          <img
            src="https://res.cloudinary.com/dsctpzqvy/image/upload/v1776300844/Design_sem_nome_onbzb5.png"
            alt="Luci Book Logo"
            className="w-32 h-auto drop-shadow-md"
          />
        </div>

        <nav className="flex-1 flex flex-col gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 text-[15px] font-medium ${
                  isActive
                    ? "bg-gradient-to-r from-pink-50 to-pink-100/50 text-[var(--accent)] shadow-sm"
                    : "text-sub hover:bg-gray-50/80 hover:text-main"
                }`
              }
            >
              <item.icon className="w-[22px] h-[22px]" strokeWidth={2.3} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sub hover:bg-red-50 hover:text-red-500 transition-all duration-300 mt-auto text-[15px] font-medium"
        >
          <LogOut className="w-[22px] h-[22px]" strokeWidth={2.3} />
          Sair
        </button>
      </aside>

      {/* Mobile Header with Logo */}
      <header className="md:hidden flex flex-row items-center justify-center h-[60px] bg-white/70 backdrop-blur-xl border-b border-gray-100/50 mb-4 sticky top-0 z-40 transition-all">
        <img
          src="https://res.cloudinary.com/dsctpzqvy/image/upload/v1776300844/Design_sem_nome_onbzb5.png"
          alt="Luci Book Logo"
          className="h-8 w-auto object-contain mt-2"
        />
      </header>

      {/* Main Content */}
      <main className="p-4 md:p-0 max-w-7xl mx-auto h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 25, duration: 0.3 }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* iOS-Style Bottom Tab Bar - Pill Shape */}
      <nav className="md:hidden fixed bottom-6 inset-x-4 max-w-sm mx-auto bg-white/85 backdrop-blur-[24px] border border-gray-100/50 z-50 px-2 py-2 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
        <div className="flex justify-around items-center w-full no-scrollbar gap-1 relative">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center h-12 flex-1 rounded-full transition-all duration-300 shrink-0 ${
                  isActive ? "text-[var(--accent)]" : "text-gray-400"
                }`
              }
            >
              {({ isActive }) => (
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  className="flex flex-col items-center justify-center gap-0.5 w-full h-full"
                >
                  {isActive && (
                    <motion.div
                      layoutId="bottom-nav-indicator"
                      className="absolute inset-0 bg-pink-50/90 rounded-full -z-10"
                      transition={{ type: "spring", stiffness: 450, damping: 30 }}
                    />
                  )}
                  <item.icon
                    className={`w-5 h-5 transition-all duration-300 ${
                      isActive ? "scale-110" : ""
                    }`}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  {isActive && (
                    <span className="text-[9px] tracking-tight transition-all duration-300 font-bold opacity-100">
                      {item.label}
                    </span>
                  )}
                </motion.div>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
