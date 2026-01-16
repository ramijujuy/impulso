import React, { useContext, useEffect, useState } from "react";
import AuthContext from "../context/AuthContext";
import axios from "axios";
import { Navigate, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

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
      const res = await axios.get(`/api/current-accounts/person/${person._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
      let res = await axios.put(`/api/persons/${selectedPerson._id}`, details, config);
      let updatedPerson = res.data.data;

      // 2. Check if group changed
      const currentGroupId = selectedPerson.group ? selectedPerson.group._id : "";
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
      setPersons(persons.map(p => p._id === updatedPerson._id ? updatedPerson : p));
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

  if (loading) return <div style={{ padding: "20px" }}>Cargando...</div>;
  if (!user) return <Navigate to="/login" />;
  if (!(user.role === "admin" || user.role === "administrativo"))
    return <Navigate to="/dashboard" />;

  const createPerson = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.post("/api/persons", {
        ...newPerson,
        group: newPerson.group || null,
      }, config);
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
      filterGroup === "all"
        ? true
        : p.group && p.group._id === filterGroup;
    // Assuming 'status' field exists or deriving it. 
    // If no status field, we might filter by financialStatus or similar.
    // For now, let's assume financialStatus is what we want to filter by, 
    // or if there's an approval status.
    // Let's use financialStatus for now as a proxy if no other status exists.
    const matchesStatus =
      filterStatus === "all"
        ? true
        : (p.status || "Pending") === filterStatus;

    return matchesDni && matchesGroup && matchesStatus;
  });

  /* 
  const handleExport = () => {
    // ... exported removed as requested
  }; 
  */

  const getStatusColor = (status) => {
    switch (status) {
      case "Approved": return "#10b981";
      case "Rejected": return "#ef4444";
      case "Pending": return "#f59e0b";
      default: return "#6b7280";
    }
  };

  return (
    <div style={{ padding: "32px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "32px",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "30px",
              fontWeight: "bold",
              color: "#111827",
              margin: "0",
            }}
          >
            Gestión de Personas
          </h2>
          <p
            style={{ color: "#6b7280", marginTop: "8px", margin: "8px 0 0 0" }}
          >
            Administre la información y estado de los solicitantes.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            padding: "8px 16px",
            backgroundColor: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "500",
            fontSize: "14px",
          }}
          onMouseEnter={(e) => (e.target.style.backgroundColor = "#1d4ed8")}
          onMouseLeave={(e) => (e.target.style.backgroundColor = "#2563eb")}
        >
          {showCreateForm ? "Cancelar" : "+ Nueva Persona"}
        </button>
      </div>

      {msg && (
        <div
          style={{
            padding: "16px",
            marginBottom: "24px",
            borderRadius: "8px",
            border: "1px solid #fecaca",
            backgroundColor: "#fef2f2",
            color: "#b91c1c",
          }}
        >
          {msg}
        </div>
      )}

      {showCreateForm && (
        <div
          style={{
            backgroundColor: "white",
            padding: "24px",
            marginBottom: "24px",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)",
          }}
        >
          <h3
            style={{
              fontSize: "18px",
              fontWeight: "bold",
              color: "#111827",
              marginBottom: "16px",
            }}
          >
            Registrar Nueva Persona
          </h3>
          <form onSubmit={createPerson}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "16px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "4px",
                  }}
                >
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
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "4px",
                  }}
                >
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
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "4px",
                  }}
                >
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
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
            <div style={{ marginTop: "16px" }}>
              <button
                type="submit"
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "500",
                  fontSize: "14px",
                }}
                onMouseEnter={(e) =>
                  (e.target.style.backgroundColor = "#059669")
                }
                onMouseLeave={(e) =>
                  (e.target.style.backgroundColor = "#10b981")
                }
              >
                Guardar Persona
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters Section */}
      <div
        style={{
          backgroundColor: "white",
          padding: "24px",
          marginBottom: "24px",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)",
        }}
      >
        <h3
          style={{
            fontSize: "16px",
            fontWeight: "600",
            color: "#111827",
            marginBottom: "16px",
          }}
        >
          Filtros y Búsqueda
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#374151",
                marginBottom: "4px",
              }}
            >
              Buscar por DNI
            </label>
            <input
              type="text"
              placeholder="Ingrese DNI..."
              value={searchDni}
              onChange={(e) => setSearchDni(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#374151",
                marginBottom: "4px",
              }}
            >
              Filtrar por Grupo
            </label>
            <select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
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
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                color: "#374151",
                marginBottom: "4px",
              }}
            >
              Filtrar por Estado Financiero
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            >
              <option value="all">Todos</option>
              <option value="Unknown">Desconocido</option>
              <option value="Good">Bueno</option>
              <option value="Bad">Malo</option>
              {/* Add other statuses as needed */}
            </select>
          </div>
        </div>
      </div>

      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)",
          border: "1px solid #e5e7eb",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            paddingLeft: "24px",
            paddingRight: "24px",
            paddingTop: "16px",
            paddingBottom: "16px",
            borderBottom: "1px solid #e5e7eb",
            backgroundColor: "#f9fafb",
          }}
        >
          <h3 style={{ fontWeight: "600", color: "#111827", margin: "0" }}>
            Listado de Personas ({filteredPersons.length})
          </h3>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              textAlign: "left",
              borderCollapse: "collapse",
            }}
          >
            <thead
              style={{
                backgroundColor: "#f9fafb",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <tr>
                <th
                  style={{
                    paddingLeft: "24px",
                    paddingRight: "24px",
                    paddingTop: "12px",
                    paddingBottom: "12px",
                    fontSize: "12px",
                    fontWeight: "500",
                    color: "#6b7280",
                    textTransform: "uppercase",
                  }}
                >
                  Nombre
                </th>
                <th
                  style={{
                    paddingLeft: "24px",
                    paddingRight: "24px",
                    paddingTop: "12px",
                    paddingBottom: "12px",
                    fontSize: "12px",
                    fontWeight: "500",
                    color: "#6b7280",
                    textTransform: "uppercase",
                  }}
                >
                  DNI
                </th>
                <th
                  style={{
                    paddingLeft: "24px",
                    paddingRight: "24px",
                    paddingTop: "12px",
                    paddingBottom: "12px",
                    fontSize: "12px",
                    fontWeight: "500",
                    color: "#6b7280",
                    textTransform: "uppercase",
                  }}
                >
                  Grupo
                </th>
                <th
                  style={{
                    paddingLeft: "24px",
                    paddingRight: "24px",
                    paddingTop: "12px",
                    paddingBottom: "12px",
                    fontSize: "12px",
                    fontWeight: "500",
                    color: "#6b7280",
                    textTransform: "uppercase",
                  }}
                >
                  Estado
                </th>
                <th
                  style={{
                    paddingLeft: "24px",
                    paddingRight: "24px",
                    paddingTop: "12px",
                    paddingBottom: "12px",
                    fontSize: "12px",
                    fontWeight: "500",
                    color: "#6b7280",
                    textTransform: "uppercase",
                    textAlign: "right",
                  }}
                >
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPersons.map((p) => (
                <tr
                  key={p._id}
                  style={{
                    borderBottom: "1px solid #f3f4f6",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#f9fafb")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <td
                    style={{
                      paddingLeft: "24px",
                      paddingRight: "24px",
                      paddingTop: "16px",
                      paddingBottom: "16px",
                      fontSize: "14px",
                      color: "#111827",
                      fontWeight: "500",
                    }}
                  >
                    {p.fullName}
                  </td>
                  <td
                    style={{
                      paddingLeft: "24px",
                      paddingRight: "24px",
                      paddingTop: "16px",
                      paddingBottom: "16px",
                      fontSize: "14px",
                      color: "#6b7280",
                    }}
                  >
                    {p.dni}
                  </td>
                  <td
                    style={{
                      paddingLeft: "24px",
                      paddingRight: "24px",
                      paddingTop: "16px",
                      paddingBottom: "16px",
                      fontSize: "14px",
                      color: "#6b7280",
                    }}
                  >
                    {p.group ? p.group.name : "Sin grupo"}
                  </td>
                  <td
                    style={{
                      paddingLeft: "24px",
                      paddingRight: "24px",
                      paddingTop: "16px",
                      paddingBottom: "16px",
                      fontSize: "14px",
                    }}
                  >
                    <span
                      style={{
                        paddingLeft: "8px",
                        paddingRight: "8px",
                        paddingTop: "4px",
                        paddingBottom: "4px",
                        borderRadius: "9999px",
                        fontSize: "12px",
                        fontWeight: "500",
                        backgroundColor:
                          p.status === "Approved"
                            ? "#dcfce7"
                            : p.status === "Moroso" || p.status === "Rejected"
                              ? "#fee2e2"
                              : "#fef3c7",
                        color:
                          p.status === "Approved"
                            ? "#15803d"
                            : p.status === "Moroso" || p.status === "Rejected"
                              ? "#991b1b"
                              : "#92400e",
                      }}
                    >
                      {p.status === "Approved"
                        ? "Aprobado"
                        : p.status === "Moroso"
                          ? "Moroso"
                          : p.status === "Rejected"
                            ? "Rechazado"
                            : "Pendiente"}
                    </span>
                  </td>
                  <td
                    style={{
                      paddingLeft: "24px",
                      paddingRight: "24px",
                      paddingTop: "16px",
                      paddingBottom: "16px",
                      textAlign: "right",
                    }}
                  >
                    <button
                      onClick={() => handleViewPerson(p)}
                      style={{
                        color: "#2563eb",
                        fontWeight: "500",
                        fontSize: "14px",
                        border: "none",
                        backgroundColor: "transparent",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) =>
                        (e.target.style.textDecoration = "underline")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.textDecoration = "none")
                      }
                    >
                      Ver
                    </button>
                    <button
                      onClick={() => navigate(`/dashboard/current-accounts?personId=${p._id}`)}
                      style={{
                        color: "#059669",
                        fontWeight: "500",
                        fontSize: "14px",
                        border: "none",
                        backgroundColor: "transparent",
                        cursor: "pointer",
                        marginLeft: "12px",
                      }}
                      onMouseEnter={(e) =>
                        (e.target.style.textDecoration = "underline")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.textDecoration = "none")
                      }
                    >
                      Ver Cuenta
                    </button>
                  </td>
                </tr>
              ))}
              {filteredPersons.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ padding: "24px", textAlign: "center", color: "#6b7280" }}>
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
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setSelectedPerson(null)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "600px",
              width: "90%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "20px", fontWeight: "bold", margin: 0 }}>
                {isEditing ? "Editar Persona" : "Detalles de la Persona"}
              </h3>
              <div style={{ display: "flex", gap: "8px" }}>
                {!isEditing && (
                  <button
                    onClick={() => {
                      setEditFormData({
                        ...selectedPerson,
                        group: selectedPerson.group ? selectedPerson.group._id : "",
                      });
                      setIsEditing(true);
                    }}
                    style={{
                      padding: "6px 12px",
                      backgroundColor: "#2563eb",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500"
                    }}
                  >
                    Editar
                  </button>
                )}
                <button
                  onClick={() => setSelectedPerson(null)}
                  style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#6b7280" }}
                >
                  ×
                </button>
              </div>
            </div>

            {isEditing ? (
              <form onSubmit={handleUpdatePerson}>
                <div style={{ marginBottom: "24px", display: "grid", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "4px" }}>Nombre Completo</label>
                    <input
                      type="text"
                      className="input-field"
                      value={editFormData.fullName || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                      required
                      style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "4px" }}>DNI</label>
                    <input
                      type="text"
                      className="input-field"
                      value={editFormData.dni || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, dni: e.target.value })}
                      required
                      style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "4px" }}>Dirección</label>
                    <input
                      type="text"
                      className="input-field"
                      value={editFormData.address || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                      required
                      style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "4px" }}>Grupo</label>
                    <select
                      value={editFormData.group || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, group: e.target.value })}
                      style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px" }}
                    >
                      <option value="">Sin asignar</option>
                      {groups.map((g) => (
                        <option key={g._id} value={g._id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "4px" }}>Estado Financiero</label>
                    <select
                      value={editFormData.financialStatus || "Unknown"}
                      onChange={(e) => setEditFormData({ ...editFormData, financialStatus: e.target.value })}
                      style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px" }}
                    >
                      <option value="Unknown">Desconocido</option>
                      <option value="Good">Bueno</option>
                      <option value="Bad">Malo</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "4px" }}>Observaciones</label>
                    <textarea
                      value={editFormData.observation || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, observation: e.target.value })}
                      style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", minHeight: "80px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "14px", fontWeight: "500", marginBottom: "4px" }}>Estado Manual (Opcional)</label>
                    <select
                      value={editFormData.status || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                      style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px" }}
                    >
                      <option value="">-- Automático (Basado en Chequeos) --</option>
                      <option value="Pending">Pendiente</option>
                      <option value="Approved">Aprobado</option>
                      <option value="Rejected">Rechazado</option>
                      <option value="Active">Activo</option>
                      <option value="Active Loan">Préstamo Activo</option>
                      <option value="Moroso">Moroso</option>
                    </select>
                    <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                      * Seleccione un estado para forzarlo manualmente. Deje en "Automático" para usar las verificaciones.
                    </p>
                  </div>

                  <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "16px" }}>
                    <h4 style={{ fontSize: "14px", color: "#6b7280", textTransform: "uppercase", marginBottom: "12px" }}>Verificaciones</h4>
                    <div style={{ display: "grid", gap: "12px" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="checkbox"
                          checked={editFormData.dniChecked || false}
                          onChange={(e) => setEditFormData({ ...editFormData, dniChecked: e.target.checked })}
                        />
                        Documentación Completa (DNI)
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="checkbox"
                          checked={editFormData.boletaServicioChecked || false}
                          onChange={(e) => setEditFormData({ ...editFormData, boletaServicioChecked: e.target.checked })}
                        />
                        Boleta de Servicio
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="checkbox"
                          checked={editFormData.garanteChecked || false}
                          onChange={(e) => setEditFormData({ ...editFormData, garanteChecked: e.target.checked })}
                        />
                        Garante
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="checkbox"
                          checked={editFormData.estadoFinancieroChecked || false}
                          onChange={(e) => setEditFormData({ ...editFormData, estadoFinancieroChecked: e.target.checked })}
                        />
                        Estado Financiero Verificado
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="checkbox"
                          checked={editFormData.carpetaCompletaChecked || false}
                          onChange={(e) => setEditFormData({ ...editFormData, carpetaCompletaChecked: e.target.checked })}
                        />
                        Carpeta Completa
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="checkbox"
                          checked={editFormData.verificacionChecked || false}
                          onChange={(e) => setEditFormData({ ...editFormData, verificacionChecked: e.target.checked })}
                        />
                        Verificación General
                      </label>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#e5e7eb",
                      color: "#374151",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: "500"
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#10b981",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: "500"
                    }}
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div style={{ marginBottom: "24px" }}>
                  <h4 style={{ fontSize: "14px", color: "#6b7280", textTransform: "uppercase", marginBottom: "8px" }}>Información Personal</h4>
                  <p style={{ margin: "4px 0" }}><strong>Nombre:</strong> {selectedPerson.fullName}</p>
                  <p style={{ margin: "4px 0" }}><strong>DNI:</strong> {selectedPerson.dni}</p>
                  <p style={{ margin: "4px 0" }}><strong>Dirección:</strong> {selectedPerson.address}</p>
                  <p style={{ margin: "4px 0" }}><strong>Grupo:</strong> {selectedPerson.group ? selectedPerson.group.name : "Sin asignar"}</p>
                  {selectedPerson.observation && (
                    <p style={{ margin: "4px 0" }}><strong>Observaciones:</strong> {selectedPerson.observation}</p>
                  )}
                </div>

                {selectedPersonAccount && (
                  <div style={{ marginBottom: "24px", padding: "16px", backgroundColor: "#eff6ff", borderRadius: "8px", border: "1px solid #dbeafe" }}>
                    <h4 style={{ fontSize: "14px", color: "#1e40af", textTransform: "uppercase", marginBottom: "8px", fontWeight: "bold" }}>Cuenta Corriente</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "14px" }}>
                      <div>
                        <span style={{ color: "#6b7280" }}>Total:</span>
                        <span style={{ marginLeft: "4px", fontWeight: "600", color: "#1e3a8a" }}>${selectedPersonAccount.totalAmount?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span style={{ color: "#6b7280" }}>Pagado:</span>
                        <span style={{ marginLeft: "4px", fontWeight: "600", color: "#15803d" }}>
                          ${selectedPersonAccount.installments?.filter(i => i.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: "#6b7280" }}>Cuotas:</span>
                        <span style={{ marginLeft: "4px", fontWeight: "600", color: "#1e3a8a" }}>{selectedPersonAccount.installments?.length}</span>
                      </div>
                      <div>
                        <span style={{ color: "#6b7280" }}>Estado:</span>
                        <span style={{ marginLeft: "4px", fontWeight: "600", color: selectedPersonAccount.status === 'active' ? '#15803d' : '#b91c1c' }}>
                          {selectedPersonAccount.status === 'active' ? 'Activa' : 'Inactiva'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "16px" }}>
                  <h4 style={{ fontSize: "14px", color: "#6b7280", textTransform: "uppercase", marginBottom: "12px" }}>Verificaciones de Aprobación</h4>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span>Documentación Completa (DNI)</span>
                      <span style={{ color: selectedPerson.dniChecked ? "#10b981" : "#ef4444", fontWeight: "bold" }}>
                        {selectedPerson.dniChecked ? "✓ Verificado" : "✗ Pendiente"}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span>Boleta de Servicio</span>
                      <span style={{ color: selectedPerson.boletaServicioChecked ? "#10b981" : "#ef4444", fontWeight: "bold" }}>
                        {selectedPerson.boletaServicioChecked ? "✓ Verificado" : "✗ Pendiente"}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span>Garante</span>
                      <span style={{ color: selectedPerson.garanteChecked ? "#10b981" : "#ef4444", fontWeight: "bold" }}>
                        {selectedPerson.garanteChecked ? "✓ Verificado" : "✗ Pendiente"}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span>Estado Financiero ({selectedPerson.financialStatus})</span>
                      <span style={{ color: selectedPerson.estadoFinancieroChecked ? "#10b981" : "#ef4444", fontWeight: "bold" }}>
                        {selectedPerson.estadoFinancieroChecked ? "✓ Verificado" : "✗ Pendiente"}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span>Carpeta Completa</span>
                      <span style={{ color: selectedPerson.carpetaCompletaChecked ? "#10b981" : "#ef4444", fontWeight: "bold" }}>
                        {selectedPerson.carpetaCompletaChecked ? "✓ Completa" : "✗ Incompleta"}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span>Verificación General</span>
                      <span style={{ color: selectedPerson.verificacionChecked ? "#10b981" : "#ef4444", fontWeight: "bold" }}>
                        {selectedPerson.verificacionChecked ? "✓ Aprobado" : "✗ Pendiente"}
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: "24px", padding: "12px", backgroundColor: "#f3f4f6", borderRadius: "8px", textAlign: "center" }}>
                    <p style={{ margin: 0, fontWeight: "500", color: "#374151" }}>
                      Estado General:
                      <span style={{ marginLeft: "8px", color: getStatusColor(selectedPerson.status || "Pending"), fontWeight: "bold" }}>
                        {selectedPerson.status || "Pendiente"}
                      </span>
                    </p>
                  </div>
                </div>

                <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setSelectedPerson(null)}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#e5e7eb",
                      color: "#374151",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: "500"
                    }}
                  >
                    Cerrar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Persons;
