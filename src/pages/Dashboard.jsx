import { useContext } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import AuthContext from "../context/AuthContext";

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

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
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl z-10">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-2xl font-bold tracking-tight text-white">Financiera</h3>
          <p className="text-slate-400 text-sm mt-1">Hola, {user?.username}</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
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
      <main className="flex-1 overflow-y-auto bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
