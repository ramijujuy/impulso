import { useContext, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import AuthContext from "../context/AuthContext";

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when navigating
  const handleNavClick = () => {
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };


  const navItems = [
    { path: "/dashboard", label: "Inicio", end: true },
    { path: "/dashboard/shareholders", label: "Accionistas" },
    { path: "/dashboard/groups", label: "Grupos y Personas" },
    { path: "/dashboard/loans", label: "Préstamos" },
    { path: "/dashboard/current-accounts", label: "Cuentas Corrientes" },
  ];

  if (user?.role === "admin") {
    navItems.push({ path: "/dashboard/admin", label: "Administrar Usuarios" });
  }
  if (user?.role === "admin" || user?.role === "administrativo") {
    navItems.push({ path: "/dashboard/persons", label: "Personas" });
  }


  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-slate-900 z-50 px-4 py-3 flex justify-between items-center shadow-md">
        <h3 className="text-xl font-bold text-white">Financiera</h3>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-white p-2 rounded hover:bg-slate-800"
        >
          {isMobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          )}
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 w-64 bg-slate-900 text-white flex flex-col shadow-xl z-50 transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0
      `}>
        <div className="p-6 border-b border-slate-800 hidden md:block">
          <h3 className="text-2xl font-bold tracking-tight text-white">Financiera</h3>
          <p className="text-slate-400 text-sm mt-1">Hola, {user?.username}</p>
        </div>

        {/* Mobile-only user info in sidebar top */}
        <div className="p-6 border-b border-slate-800 md:hidden mt-12">
          <p className="text-slate-400 text-sm">Hola, {user?.username}</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `block px-4 py-3 rounded-lg transition duration-200 font-medium ${isActive
                  ? "bg-primary-600 text-white shadow-md"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition duration-200 flex items-center justify-center gap-2 font-medium"
          >
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gray-50 p-4 pt-20 md:p-8 md:pt-8 w-full">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
