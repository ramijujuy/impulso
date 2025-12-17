import React, { useContext, useEffect, useState } from "react";
import AuthContext from "../context/AuthContext";
import axios from "axios";
import { Navigate } from "react-router-dom";

const AdminUsers = () => {
  const { user, loading } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "staff",
  });
  const [msg, setMsg] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editRole, setEditRole] = useState("");
  const [editPassword, setEditPassword] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get("/api/users");
        setUsers(res.data.data || []);
      } catch (error) {
        setMsg(error.response?.data?.error || error.message);
      }
    };
    if (user && user.role === "admin") fetchUsers();
  }, [user]);

  if (loading) return <div>Cargando...</div>;
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "admin") return <Navigate to="/dashboard" />;

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await axios.post("/api/users", form);
      setMsg("Usuario creado correctamente");
      setUsers((prev) => [res.data.data, ...prev]);
      setForm({ username: "", password: "", role: "staff" });
    } catch (error) {
      setMsg(error.response?.data?.error || error.message);
    }
  };

  const startEdit = (u) => {
    setEditingId(u._id);
    setEditRole(u.role || "staff");
    setEditPassword("");
    setMsg(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditRole("");
    setEditPassword("");
    setMsg(null);
  };

  const saveEdit = async (id) => {
    setMsg(null);
    try {
      // update role if changed
      const updates = { role: editRole };
      const res = await axios.put(`/api/users/${id}`, updates);
      // update local list
      setUsers((prev) => prev.map((u) => (u._id === id ? res.data.data : u)));

      // update password if provided
      if (editPassword && editPassword.length >= 4) {
        await axios.put(`/api/users/${id}/password`, {
          password: editPassword,
        });
        setMsg("Rol y/o contraseña actualizados correctamente");
      } else {
        setMsg("Rol actualizado correctamente");
      }

      cancelEdit();
    } catch (error) {
      setMsg(error.response?.data?.error || error.message);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Administración de Usuarios</h2>
          <p className="text-gray-500 mt-1">Gestione los usuarios del sistema y sus permisos.</p>
        </div>
      </div>

      {msg && (
        <div className={`p-4 mb-6 rounded-lg border ${msg.includes("correctamente") ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          <div className="flex items-center gap-2">
            <span>{msg}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Crear Nuevo Usuario</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                <input
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  required
                  className="input-field"
                  placeholder="Nombre de usuario"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className="input-field"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="admin">Administrador</option>
                  <option value="administrativo">Administrativo</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
              <button type="submit" className="btn-primary w-full justify-center">
                Crear Usuario
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Usuarios Existentes</h3>
              <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">{users.length} Total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="table-header">Usuario</th>
                    <th className="table-header">Rol</th>
                    <th className="table-header">Creado</th>
                    <th className="table-header text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-50 transition">
                      <td className="table-cell font-medium text-gray-900">{u.username}</td>
                      <td className="table-cell">
                        {editingId === u._id ? (
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            className="text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                          >
                            <option value="admin">Administrador</option>
                            <option value="administrativo">Administrativo</option>
                            <option value="staff">Staff</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                              u.role === 'administrativo' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                            }`}>
                            {u.role}
                          </span>
                        )}
                      </td>
                      <td className="table-cell text-gray-500 text-sm">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="table-cell text-right">
                        {editingId === u._id ? (
                          <div className="flex items-center justify-end gap-2">
                            <input
                              placeholder="Nueva contraseña"
                              value={editPassword}
                              onChange={(e) => setEditPassword(e.target.value)}
                              className="text-sm border-gray-300 rounded-md w-32 px-2 py-1 focus:ring-primary-500 focus:border-primary-500"
                              type="password"
                            />
                            <button
                              onClick={() => saveEdit(u._id)}
                              className="text-green-600 hover:text-green-800 p-1"
                              title="Guardar"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Cancelar"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(u)}
                            className="text-primary-600 hover:text-primary-800 font-medium text-sm hover:underline"
                          >
                            Editar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-gray-500">No hay usuarios registrados.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
