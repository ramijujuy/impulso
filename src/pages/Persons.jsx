import React, { useContext, useEffect, useState } from "react";
import AuthContext from "../context/AuthContext";
import axios from "axios";
import { Navigate, useNavigate } from "react-router-dom";

const Persons = () => {
  const { user, loading, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [persons, setPersons] = useState([]);
  const [groups, setGroups] = useState([]);
  const [msg, setMsg] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Filters and Search State
  const [searchDni, setSearchDni] = useState("");
  const [filterGroup, setFilterGroup] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Modal State
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [selectedPersonAccount, setSelectedPersonAccount] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  const handleViewPerson = async (person) => {
    setSelectedPerson(person);
    setIsEditing(false);
    setSelectedPersonAccount(null);
    try {
      const res = await axios.get(
        `/api/current-accounts/person/${person._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSelectedPersonAccount(res.data.data);
    } catch (error) {
      // It's okay if they don't have an account
      console.log("No current account found for this person");
    }
  };

  const handleUpdatePerson = async (e) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };

      // 1. Update basic details (excluding group)
      const { group, ...details } = editFormData;
      let res = await axios.put(
        `/api/persons/${selectedPerson._id}`,
        details,
        config
      );
      let updatedPerson = res.data.data;

      // 2. Check if group changed
      const currentGroupId = selectedPerson.group
        ? selectedPerson.group._id
        : "";
      const newGroupId = editFormData.group || "";

      if (currentGroupId !== newGroupId) {
        // Call dedicated endpoint for group update
        const groupRes = await axios.put(
          `/api/persons/${selectedPerson._id}/group`,
          { groupId: newGroupId || null },
          config
        );
        updatedPerson = groupRes.data.data;
      }

      // Update local state with the final updated person (which has the correct status)
      setPersons(
        persons.map((p) => (p._id === updatedPerson._id ? updatedPerson : p))
      );
      setSelectedPerson(updatedPerson);
      setIsEditing(false);
      setMsg("Persona actualizada correctamente");
      setTimeout(() => setMsg(null), 3000);
    } catch (error) {
      setMsg(error.response?.data?.error || "Error al actualizar persona");
    }
  };

  const [newPerson, setNewPerson] = useState({
    fullName: "",
    dni: "",
    address: "",
    financialStatus: "Unknown",
    group: "",
  });

  useEffect(() => {
    const fetch = async () => {
      try {
        const [personsRes, groupsRes] = await Promise.all([
          axios.get("/api/persons"),
          axios.get("/api/groups"),
        ]);
        setPersons(personsRes.data.data || []);
        setGroups(groupsRes.data.data || []);
      } catch (error) {
        setMsg(error.response?.data?.error || error.message);
      }
    };
    if (user && (user.role === "admin" || user.role === "administrativo"))
      fetch();
  }, [user]);

  if (loading) return <div className="p-8">Cargando...</div>;
  if (!user) return <Navigate to="/login" />;
  if (!(user.role === "admin" || user.role === "administrativo"))
    return <Navigate to="/dashboard" />;

  const createPerson = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.post(
        "/api/persons",
        {
          ...newPerson,
          group: newPerson.group || null,
        },
        config
      );
      setPersons([res.data.data, ...persons]);
      if (newPerson.group) {
        const groupsRes = await axios.get("/api/groups");
        setGroups(groupsRes.data.data || []);
      }
      setNewPerson({
        fullName: "",
        dni: "",
        address: "",
        financialStatus: "Unknown",
        group: "",
      });
      setShowCreateForm(false);
      setMsg("Persona creada correctamente");
    } catch (error) {
      setMsg(error.response?.data?.error || error.message);
    }
  };

  // Filter Logic
  const filteredPersons = persons.filter((p) => {
    const matchesDni = p.dni.includes(searchDni);
    const matchesGroup =
      filterGroup === "all" ? true : p.group && p.group._id === filterGroup;
    const matchesStatus =
      filterStatus === "all" ? true : (p.status || "Pending") === filterStatus;

    return matchesDni && matchesGroup && matchesStatus;
  });

  const getStatusColorClass = (status) => {
    switch (status) {
      case "Approved":
        return "bg-green-100 text-green-800";
      case "Rejected":
      case "Moroso":
        return "bg-red-100 text-red-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "Approved": return "Aprobado";
      case "Rejected": return "Rechazado";
      case "Moroso": return "Moroso";
      default: return "Pendiente";
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight m-0">
            Gestión de Personas
          </h2>
          <p className="text-gray-500 mt-2">
            Administre la información y estado de los solicitantes.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm w-full md:w-auto"
        >
          {showCreateForm ? "Cancelar" : "+ Nueva Persona"}
        </button>
      </div>

      {msg && (
        <div className={`p-4 mb-6 rounded-lg border ${msg.includes("correctamente") || msg.includes("✓")
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-red-50 border-red-200 text-red-800"
          }`}>
          {msg}
        </div>
      )}

      {showCreateForm && (
        <div className="bg-white p-6 mb-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Registrar Nueva Persona
          </h3>
          <form onSubmit={createPerson}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  placeholder="Ej: Juan Pérez"
                  value={newPerson.fullName}
                  onChange={(e) =>
                    setNewPerson({ ...newPerson, fullName: e.target.value })
                  }
                  required
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  DNI
                </label>
                <input
                  type="text"
                  placeholder="Ej: 12345678"
                  value={newPerson.dni}
                  onChange={(e) =>
                    setNewPerson({ ...newPerson, dni: e.target.value })
                  }
                  required
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  placeholder="Ej: Av. Siempre Viva 123"
                  value={newPerson.address}
                  onChange={(e) =>
                    setNewPerson({ ...newPerson, address: e.target.value })
                  }
                  required
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="mt-4">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-medium w-full md:w-auto"
              >
                Guardar Persona
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters Section */}
      <div className="bg-white p-6 mb-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Filtros y Búsqueda
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar por DNI
            </label>
            <input
              type="text"
              placeholder="Ingrese DNI..."
              value={searchDni}
              onChange={(e) => setSearchDni(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filtrar por Grupo
            </label>
            <select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="all">Todos los grupos</option>
              {groups.map((g) => (
                <option key={g._id} value={g._id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filtrar por Estado
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="all">Todos</option>
              <option value="Pending">Pendiente</option>
              <option value="Approved">Aprobado</option>
              <option value="Rejected">Rechazado</option>
              <option value="Moroso">Moroso</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-900 m-0">
            Listado de Personas ({filteredPersons.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  DNI
                </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grupo
                </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPersons.map((p) => (
                <tr
                  key={p._id}
                  className="hover:bg-gray-50 transition"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {p.fullName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {p.dni}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {p.group ? p.group.name : "Sin grupo"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColorClass(p.status)}`}
                    >
                      {getStatusLabel(p.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => handleViewPerson(p)}
                      className="text-blue-600 hover:underline font-medium bg-transparent border-none cursor-pointer"
                    >
                      Ver
                    </button>
                    <button
                      onClick={() =>
                        navigate(
                          `/dashboard/current-accounts?personId=${p._id}`
                        )
                      }
                      className="text-green-600 hover:underline font-medium ml-3 bg-transparent border-none cursor-pointer"
                    >
                      Ver Cuenta
                    </button>
                  </td>
                </tr>
              ))}
              {filteredPersons.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    className="p-6 text-center text-gray-500"
                  >
                    No se encontraron personas con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedPerson && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedPerson(null)}>
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-gray-900 m-0">
                {isEditing ? "Editar Persona" : "Detalles de la Persona"}
              </h3>
              <div className="flex gap-2">
                {!isEditing && (
                  <button
                    onClick={() => {
                      setEditFormData({
                        ...selectedPerson,
                        group: selectedPerson.group
                          ? selectedPerson.group._id
                          : "",
                      });
                      setIsEditing(true);
                    }}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    Editar
                  </button>
                )}
                <button
                  onClick={() => setSelectedPerson(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold bg-transparent border-none cursor-pointer"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              {isEditing ? (
                <form onSubmit={handleUpdatePerson} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre Completo
                      </label>
                      <input
                        type="text"
                        className="w-full p-2 border border-gray-300 rounded-md"
                        value={editFormData.fullName || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            fullName: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        DNI
                      </label>
                      <input
                        type="text"
                        className="w-full p-2 border border-gray-300 rounded-md"
                        value={editFormData.dni || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            dni: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dirección
                      </label>
                      <input
                        type="text"
                        className="w-full p-2 border border-gray-300 rounded-md"
                        value={editFormData.address || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            address: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Grupo
                      </label>
                      <select
                        value={editFormData.group || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            group: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Sin asignar</option>
                        {groups.map((g) => (
                          <option key={g._id} value={g._id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estado Financiero
                      </label>
                      <select
                        value={editFormData.financialStatus || "Unknown"}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            financialStatus: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="Unknown">Desconocido</option>
                        <option value="Good">Bueno</option>
                        <option value="Bad">Malo</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Observaciones
                      </label>
                      <textarea
                        value={editFormData.observation || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            observation: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-gray-300 rounded-md min-h-[80px]"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estado Manual (Opcional)
                      </label>
                      <select
                        value={editFormData.status || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            status: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="">
                          -- Automático (Basado en Chequeos) --
                        </option>
                        <option value="Pending">Pendiente</option>
                        <option value="Approved">Aprobado</option>
                        <option value="Rejected">Rechazado</option>
                        <option value="Active">Activo</option>
                        <option value="Active Loan">Préstamo Activo</option>
                        <option value="Moroso">Moroso</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        * Seleccione un estado para forzarlo manualmente. Deje en
                        "Automático" para usar las verificaciones.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-500 uppercase mb-3">
                      Verificaciones
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={editFormData.dniChecked || false}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              dniChecked: e.target.checked,
                            })
                          }
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Documentación Completa (DNI)
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={editFormData.boletaServicioChecked || false}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              boletaServicioChecked: e.target.checked,
                            })
                          }
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Boleta de Servicio
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={editFormData.garanteChecked || false}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              garanteChecked: e.target.checked,
                            })
                          }
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Garante
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={
                            editFormData.estadoFinancieroChecked || false
                          }
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              estadoFinancieroChecked: e.target.checked,
                            })
                          }
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Estado Financiero Verificado
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={editFormData.carpetaCompletaChecked || false}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              carpetaCompletaChecked: e.target.checked,
                            })
                          }
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Carpeta Completa
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={editFormData.verificacionChecked || false}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              verificacionChecked: e.target.checked,
                            })
                          }
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Verificación General
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="mb-6 space-y-2">
                    <h4 className="text-sm font-medium text-gray-500 uppercase mb-2">
                      Información Personal
                    </h4>
                    <p className="text-sm">
                      <strong className="text-gray-900">Nombre:</strong> {selectedPerson.fullName}
                    </p>
                    <p className="text-sm">
                      <strong className="text-gray-900">DNI:</strong> {selectedPerson.dni}
                    </p>
                    <p className="text-sm">
                      <strong className="text-gray-900">Dirección:</strong> {selectedPerson.address}
                    </p>
                    <p className="text-sm">
                      <strong className="text-gray-900">Grupo:</strong>{" "}
                      {selectedPerson.group
                        ? selectedPerson.group.name
                        : "Sin asignar"}
                    </p>
                    {selectedPerson.observation && (
                      <p className="text-sm">
                        <strong className="text-gray-900">Observaciones:</strong>{" "}
                        {selectedPerson.observation}
                      </p>
                    )}
                  </div>

                  {selectedPersonAccount && (
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <h4 className="text-sm font-bold text-blue-800 uppercase mb-2">
                        Cuenta Corriente
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">Total:</span>
                          <span className="ml-1 font-semibold text-blue-900">
                            ${selectedPersonAccount.totalAmount?.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Pagado:</span>
                          <span className="ml-1 font-semibold text-green-700">
                            $
                            {selectedPersonAccount.installments
                              ?.filter((i) => i.status === "paid")
                              .reduce((acc, curr) => acc + curr.amount, 0)
                              .toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Cuotas:</span>
                          <span className="ml-1 font-semibold text-blue-900">
                            {selectedPersonAccount.installments?.length}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Estado:</span>
                          <span
                            className={`ml-1 font-semibold ${selectedPersonAccount.status === "active" ? "text-green-700" : "text-red-700"}`}
                          >
                            {selectedPersonAccount.status === "active"
                              ? "Activa"
                              : "Inactiva"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-medium text-gray-500 uppercase mb-3">
                      Verificaciones de Aprobación
                    </h4>

                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">Documentación Completa (DNI)</span>
                        <span className={`font-bold ${selectedPerson.dniChecked ? "text-green-600" : "text-red-500"}`}>
                          {selectedPerson.dniChecked ? "✓ Verificado" : "✗ Pendiente"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">Boleta de Servicio</span>
                        <span className={`font-bold ${selectedPerson.boletaServicioChecked ? "text-green-600" : "text-red-500"}`}>
                          {selectedPerson.boletaServicioChecked ? "✓ Verificado" : "✗ Pendiente"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">Garante</span>
                        <span className={`font-bold ${selectedPerson.garanteChecked ? "text-green-600" : "text-red-500"}`}>
                          {selectedPerson.garanteChecked ? "✓ Verificado" : "✗ Pendiente"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">
                          Estado Financiero ({selectedPerson.financialStatus})
                        </span>
                        <span className={`font-bold ${selectedPerson.estadoFinancieroChecked ? "text-green-600" : "text-red-500"}`}>
                          {selectedPerson.estadoFinancieroChecked ? "✓ Verificado" : "✗ Pendiente"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">Carpeta Completa</span>
                        <span className={`font-bold ${selectedPerson.carpetaCompletaChecked ? "text-green-600" : "text-red-500"}`}>
                          {selectedPerson.carpetaCompletaChecked ? "✓ Completa" : "✗ Incompleta"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">Verificación General</span>
                        <span className={`font-bold ${selectedPerson.verificacionChecked ? "text-green-600" : "text-red-500"}`}>
                          {selectedPerson.verificacionChecked ? "✓ Aprobado" : "✗ Pendiente"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 p-3 bg-gray-50 rounded-lg text-center">
                      <p className="m-0 font-medium text-gray-700">
                        Estado General:
                        <span className={`ml-2 font-bold ${selectedPerson.status === "Approved" ? "text-green-700" :
                            selectedPerson.status === "Rejected" ? "text-red-700" :
                              "text-yellow-700"
                          }`}>
                          {getStatusLabel(selectedPerson.status)}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => setSelectedPerson(null)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200"
                    >
                      Cerrar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Persons;
