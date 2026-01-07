import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import AuthContext from "../context/AuthContext";

const Groups = () => {
  const { token } = useContext(AuthContext);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Filter States
  const [filterStatus, setFilterStatus] = useState("all"); // all, active, inactive
  const [searchName, setSearchName] = useState("");
  const [appliedSearch, setAppliedSearch] = useState({ name: "", status: "all" });

  const [selectedGroupModal, setSelectedGroupModal] = useState(null); // { groupId, data }
  const [editMembersModal, setEditMembersModal] = useState(null); // { groupId, groupName }
  const [loanModal, setLoanModal] = useState(null); // { groupId, groupName }
  const [editStatusModal, setEditStatusModal] = useState(null); // { groupId, currentStatus }

  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
  });

  // Member Management State
  const [allPersons, setAllPersons] = useState([]);
  const [selectedPersonToAdd, setSelectedPersonToAdd] = useState("");

  // Loan State
  const [shareholders, setShareholders] = useState([]);
  const [loanData, setLoanData] = useState({
    amount: "",
    numberOfInstallments: "",
  });
  const [contributions, setContributions] = useState({}); // { shareholderId: amount }

  const fetchPersons = async () => {
    try {
      const res = await axios.get("/api/persons");
      setAllPersons(res.data.data || []);
    } catch (error) {
      console.error("Error fetching persons:", error);
    }
  };

  const fetchShareholders = async () => {
    try {
      const res = await axios.get("/api/shareholders");
      setShareholders(res.data.data || []);
    } catch (error) {
      console.error("Error fetching shareholders:", error);
    }
  };

  const handleAddMember = async (groupId) => {
    if (!selectedPersonToAdd) return;
    try {
      const person = allPersons.find(p => p._id === selectedPersonToAdd);
      if (person.group) {
        if (!window.confirm(`Esta persona ya pertenece al grupo "${person.group.name}". ¿Desea cambiarla a este grupo?`)) {
          return;
        }
      }

      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`/api/persons/${selectedPersonToAdd}/group`, { groupId: groupId }, config);
      setMsg("✓ Miembro agregado correctamente");
      setSelectedPersonToAdd("");
      fetchGroups();
    } catch (error) {
      setMsg(error.response?.data?.error || "Error al agregar miembro");
    }
  };

  const handleRemoveMember = async (personId) => {
    if (!window.confirm("¿Está seguro de quitar a esta persona del grupo?")) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`/api/persons/${personId}/group`, { groupId: null }, config);
      setMsg("✓ Miembro quitado correctamente");
      fetchGroups();
    } catch (error) {
      setMsg(error.response?.data?.error || "Error al quitar miembro");
    }
  };

  const handleGrantLoan = async (e) => {
    e.preventDefault();
    setMsg(null);

    const amount = parseFloat(loanData.amount);
    const installments = parseInt(loanData.numberOfInstallments);

    if (isNaN(amount) || amount <= 0) {
      setMsg("Monto inválido");
      return;
    }
    if (isNaN(installments) || installments < 2 || installments > 6) {
      setMsg("Cuotas deben ser entre 2 y 6");
      return;
    }

    const shareholderContributions = Object.entries(contributions)
      .map(([shareholderId, amount]) => ({
        shareholderId,
        amount: parseFloat(amount) || 0
      }))
      .filter(c => c.amount > 0);

    const totalContributed = shareholderContributions.reduce((sum, c) => sum + c.amount, 0);

    if (Math.abs(totalContributed - amount) > 0.01) {
      setMsg(`El total aportado (${totalContributed}) debe ser igual al monto del préstamo (${amount})`);
      return;
    }

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post("/api/loans", {
        groupId: loanModal.groupId,
        amount,
        numberOfInstallments: installments,
        shareholderContributions
      }, config);

      setMsg("✓ Préstamo otorgado correctamente");
      setLoanModal(null);
      setLoanData({ amount: "", numberOfInstallments: "" });
      setContributions({});
      fetchGroups();
    } catch (error) {
      setMsg(error.response?.data?.error || "Error al otorgar préstamo");
    }
  };

  useEffect(() => {
    if (editMembersModal) {
      fetchPersons();
    }
  }, [editMembersModal]);

  useEffect(() => {
    if (loanModal) {
      fetchShareholders();
    }
  }, [loanModal]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/groups");
      setGroups(res.data.data || []);
    } catch (err) {
      setMsg(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleApplyFilters = () => {
    setAppliedSearch({ name: searchName, status: filterStatus });
  };

  const createGroup = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await axios.post("/api/groups", {
        name: newGroup.name,
        description: newGroup.description || "",
      });
      setGroups([res.data.data, ...groups]);
      setNewGroup({ name: "", description: "" });
      setShowCreateForm(false);
      setMsg("✓ Grupo creado correctamente");
    } catch (err) {
      setMsg(err.response?.data?.error || err.message);
    }
  };

  const fetchGroupAccount = async (groupId) => {
    try {
      const res = await axios.get(`/api/current-accounts/group/${groupId}`);
      setSelectedGroupModal({ groupId, data: res.data.data });
    } catch (err) {
      setMsg(err.response?.data?.error || "Sin cuenta corriente");
      setSelectedGroupModal({ groupId, data: null });
    }
  };

  const createGroupAccount = async (groupId) => {
    const totalAmountStr = window.prompt(
      "Ingrese el monto total de la cuenta (ej: 1000):",
      ""
    );
    if (!totalAmountStr) return;
    const totalAmount = parseFloat(totalAmountStr);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      setMsg("Monto inválido");
      return;
    }

    const installmentsStr = window.prompt(
      "Ingrese la cantidad de cuotas (ej: 4):",
      ""
    );
    if (!installmentsStr) return;
    const numberOfInstallments = parseInt(installmentsStr, 10);
    if (isNaN(numberOfInstallments) || numberOfInstallments <= 0) {
      setMsg("Cantidad de cuotas inválida");
      return;
    }

    setMsg(null);
    try {
      const body = {
        groupId,
        totalAmount,
        numberOfInstallments,
      };
      await axios.post("/api/current-accounts", body);
      setMsg("✓ Cuenta creada correctamente");
      fetchGroupAccount(groupId);
    } catch (err) {
      setMsg(err.response?.data?.error || err.message);
    }
  };

  const handleUpdateGroupName = async (groupId, currentName) => {
    const newName = window.prompt("Ingrese el nuevo nombre del grupo:", currentName);
    if (!newName || newName === currentName) return;

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`/api/groups/${groupId}`, { name: newName }, config);
      setMsg("✓ Nombre de grupo actualizado");
      fetchGroups();
    } catch (error) {
      setMsg(error.response?.data?.error || "Error al actualizar nombre");
    }
  };

  const handleUpdateStatus = async (groupId, newStatus) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`/api/groups/${groupId}`, { status: newStatus }, config);
      setMsg("✓ Estado actualizado correctamente");
      setEditStatusModal(null);
      fetchGroups();
    } catch (error) {
      setMsg(error.response?.data?.error || "Error al actualizar estado");
    }
  };

  const [memberSearchDni, setMemberSearchDni] = useState("");

  const filteredPersonsToAdd = allPersons.filter(p =>
    p.dni.includes(memberSearchDni) || p.fullName.toLowerCase().includes(memberSearchDni.toLowerCase())
  );

  const filteredGroups = groups.filter((g) => {
    const matchesFilter =
      appliedSearch.status === "all"
        ? true
        : appliedSearch.status === "inactive"
          ? g.status !== "Active" && g.status !== "Active Loan" && g.status !== "Approved" && g.status !== "Moroso" && g.status !== "Pending"
          : g.status === appliedSearch.status;
    const matchesSearch =
      appliedSearch.name === ""
        ? true
        : g.name.toLowerCase().includes(appliedSearch.name.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Gestión de Grupos</h2>
          <p className="text-gray-500 mt-1">Consulte el estado y composición de los grupos de crédito.</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className={`px-4 py-2 text-white rounded-lg font-medium transition shadow-sm ${showCreateForm ? 'bg-gray-500 hover:bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {showCreateForm ? "Cancelar" : "+ Nuevo Grupo"}
        </button>
      </div>

      {msg && (
        <div className={`p-4 mb-6 rounded-lg border ${msg.includes("✓") ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {msg}
        </div>
      )}

      {showCreateForm && (
        <div className="card p-6 mb-8 bg-white rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Crear Nuevo Grupo</h3>
          <form onSubmit={createGroup}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Grupo</label>
                <input
                  type="text"
                  placeholder="Ej: Grupo Sur"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  required
                  className="input-field w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <input
                  type="text"
                  placeholder="Ej: Grupo de microcréditos"
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  className="input-field w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="mt-4">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-medium"
              >
                Guardar Grupo
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Filtros y Búsqueda</h3>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Por Estado</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input-field w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="all">Todos</option>
                <option value="Pending">Pendiente</option>
                <option value="Active Loan">Préstamo Activo</option>
                <option value="Moroso">Moroso</option>
                <option value="Approved">Aprobado</option>
                <option value="Rejected">Rechazado</option>
                <option value="Active">Activo (Sin Préstamo)</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Buscar por Nombre</label>
              <input
                type="text"
                placeholder="Ej: Grupo Sur"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="input-field w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <button
                onClick={handleApplyFilters}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition font-medium h-[42px]"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">Listado de Grupos ({filteredGroups.length})</h3>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Cargando grupos...</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre del Grupo</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Miembros</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Deuda Total</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredGroups.map((g) => (
                  <tr key={g._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {g.name}
                      <button
                        onClick={() => handleUpdateGroupName(g._id, g.name)}
                        className="ml-2 text-gray-400 hover:text-gray-600"
                        title="Editar nombre"
                      >
                        ✎
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${g.status === "Active" || g.status === "Approved" ? "bg-green-100 text-green-800" :
                        g.status === "Active Loan" ? "bg-blue-100 text-blue-800" :
                          g.status === "Moroso" || g.status === "Rejected" ? "bg-red-100 text-red-800" :
                            g.status === "Pending" ? "bg-yellow-100 text-yellow-800" :
                              "bg-gray-100 text-gray-800"
                        }`}>
                        {g.status === "Active" ? "Activo" :
                          g.status === "Active Loan" ? "Préstamo Activo" :
                            g.status === "Moroso" ? "Moroso" :
                              g.status === "Approved" ? "Aprobado" :
                                g.status === "Rejected" ? "Rechazado" :
                                  g.status === "Pending" ? "Pendiente" : "Inactivo"}
                      </span>
                      <button
                        onClick={() => setEditStatusModal({ groupId: g._id, currentStatus: g.status })}
                        className="ml-2 text-gray-400 hover:text-gray-600 text-xs"
                        title="Editar estado"
                      >
                        ✎
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-medium text-xs">
                        {(g.members && g.members.length) || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {g.totalDebt ? `$${g.totalDebt.toLocaleString()}` : "-"}
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      {g.status === "Active" && (
                        <button
                          onClick={() => setLoanModal({ groupId: g._id, groupName: g.name })}
                          className="text-green-600 hover:text-green-800 font-medium mr-3 hover:underline"
                        >
                          Otorgar Préstamo
                        </button>
                      )}
                      <button
                        onClick={() => setEditMembersModal({ groupId: g._id, groupName: g.name })}
                        className="text-purple-600 hover:text-purple-800 font-medium mr-3 hover:underline"
                      >
                        Editar Miembros
                      </button>
                      <button
                        onClick={() => fetchGroupAccount(g._id)}
                        className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                      >
                        Ver Cuenta
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredGroups.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      No hay grupos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Group Account Modal */}
      {selectedGroupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedGroupModal(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Cuenta Corriente del Grupo</h3>
              <button onClick={() => setSelectedGroupModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>

            <div className="p-6">
              {selectedGroupModal.data ? (
                <div>
                  <div className="mb-6 pb-6 border-b border-gray-100">
                    <h4 className="text-base font-semibold text-gray-900 mb-3">Estado de Cuenta</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <p className="text-gray-500"><strong>Total Monto:</strong> <span className="text-gray-900">${selectedGroupModal.data.totalAmount?.toLocaleString() || 0}</span></p>
                      <p className="text-gray-500"><strong>Total Pagado:</strong> <span className="text-green-600">${selectedGroupModal.data.personTotals?.totalPaid?.toLocaleString() || 0}</span></p>
                      <p className="text-gray-500"><strong>Total Pendiente:</strong> <span className="text-red-600">${selectedGroupModal.data.personTotals?.totalUnpaid?.toLocaleString() || 0}</span></p>
                      <p className="text-gray-500"><strong>Cuotas:</strong> <span className="text-gray-900">{selectedGroupModal.data.installments?.length || 0}</span></p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-base font-semibold text-gray-900 mb-3">Gestión de Miembros</h4>
                    <div className="flex gap-2 mb-4">
                      <select
                        value={selectedPersonToAdd}
                        onChange={(e) => setSelectedPersonToAdd(e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="">Seleccionar persona para agregar...</option>
                        {allPersons
                          .filter(p => !p.group || p.group._id !== selectedGroupModal.groupId)
                          .map(p => (
                            <option key={p._id} value={p._id}>
                              {p.fullName} {p.group ? `(En: ${p.group.name})` : ""}
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={() => handleAddMember(selectedGroupModal.groupId)}
                        disabled={!selectedPersonToAdd}
                        className={`px-4 py-2 text-white rounded-md text-sm font-medium transition ${selectedPersonToAdd ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
                      >
                        Agregar
                      </button>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Miembros Actuales</h5>
                      {groups.find(g => g._id === selectedGroupModal.groupId)?.members?.length > 0 ? (
                        <ul className="space-y-2">
                          {groups.find(g => g._id === selectedGroupModal.groupId).members.map(member => (
                            <li key={member._id} className="flex justify-between items-center pb-2 border-b border-gray-200 last:border-0 last:pb-0">
                              <span className="text-sm text-gray-800">{member.fullName} <span className="text-gray-500 text-xs">({member.dni})</span></span>
                              <button
                                onClick={() => handleRemoveMember(member._id)}
                                className="text-red-500 hover:text-red-700 text-sm font-medium"
                              >
                                Quitar
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No hay miembros en este grupo.</p>
                      )}
                    </div>
                  </div>

                  {selectedGroupModal.data.installments && selectedGroupModal.data.installments.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mt-4 mb-2">Cuotas del Grupo</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="p-2 text-left font-medium text-gray-500"># Cuota</th>
                              <th className="p-2 text-left font-medium text-gray-500">Monto</th>
                              <th className="p-2 text-left font-medium text-gray-500">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {selectedGroupModal.data.installments.map((inst, idx) => (
                              <tr key={idx}>
                                <td className="p-2 text-gray-600">{idx + 1}</td>
                                <td className="p-2 text-gray-600">${inst.amount || 0}</td>
                                <td className="p-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${inst.status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                                    {inst.status === "paid" ? "Pagada" : "Pendiente"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p>Este grupo no tiene una cuenta corriente activa.</p>
                  <button
                    onClick={() => createGroupAccount(selectedGroupModal.groupId)}
                    className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium text-sm"
                  >
                    Crear Cuenta
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Members Modal */}
      {editMembersModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditMembersModal(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Miembros de {editMembersModal.groupName}</h3>
              <button onClick={() => setEditMembersModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>

            <div className="p-6">
              <div className="mb-4 space-y-3">
                <input
                  type="text"
                  placeholder="Buscar persona por DNI o Nombre..."
                  value={memberSearchDni}
                  onChange={(e) => setMemberSearchDni(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                />
                <div className="flex gap-2">
                  <select
                    value={selectedPersonToAdd}
                    onChange={(e) => setSelectedPersonToAdd(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">Seleccionar persona para agregar...</option>
                    {filteredPersonsToAdd
                      .filter(p => !p.group || p.group._id !== editMembersModal.groupId)
                      .map(p => (
                        <option key={p._id} value={p._id}>
                          {p.fullName} {p.group ? `(En: ${p.group.name})` : ""}
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={() => handleAddMember(editMembersModal.groupId)}
                    disabled={!selectedPersonToAdd}
                    className={`px-4 py-2 text-white rounded-md text-sm font-medium transition ${selectedPersonToAdd ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
                  >
                    Agregar
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Miembros Actuales</h5>
                {groups.find(g => g._id === editMembersModal.groupId)?.members?.length > 0 ? (
                  <ul className="space-y-2">
                    {groups.find(g => g._id === editMembersModal.groupId).members.map(member => (
                      <li key={member._id} className="flex justify-between items-center pb-2 border-b border-gray-200 last:border-0 last:pb-0">
                        <span className="text-sm text-gray-800">{member.fullName} <span className="text-gray-500 text-xs">({member.dni})</span></span>
                        <button
                          onClick={() => handleRemoveMember(member._id)}
                          className="text-red-500 hover:text-red-700 text-sm font-medium"
                        >
                          Quitar
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 italic">No hay miembros en este grupo.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grant Loan Modal */}
      {loanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setLoanModal(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Otorgar Préstamo a {loanModal.groupName}</h3>
              <button onClick={() => setLoanModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>

            <form onSubmit={handleGrantLoan} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto Total</label>
                  <input
                    type="number"
                    value={loanData.amount}
                    onChange={(e) => setLoanData({ ...loanData, amount: e.target.value })}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cuotas (2-6)</label>
                  <input
                    type="number"
                    min="2"
                    max="6"
                    value={loanData.numberOfInstallments}
                    onChange={(e) => setLoanData({ ...loanData, numberOfInstallments: e.target.value })}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Aportes de Accionistas</h4>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-2">
                  {shareholders.map(s => (
                    <div key={s._id} className="flex justify-between items-center">
                      <span className="text-sm text-gray-800">{s.fullName}</span>
                      <input
                        type="number"
                        placeholder="Monto"
                        value={contributions[s._id] || ""}
                        onChange={(e) => setContributions({ ...contributions, [s._id]: e.target.value })}
                        className="w-24 p-1 border border-gray-300 rounded text-sm text-right"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-right text-sm font-medium">
                  Total Aportado: $
                  {Object.values(contributions).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)}
                  {' / '}
                  <span className={Math.abs(Object.values(contributions).reduce((sum, val) => sum + (parseFloat(val) || 0), 0) - (parseFloat(loanData.amount) || 0)) < 0.01 ? "text-green-600" : "text-red-600"}>
                    Objetivo: ${loanData.amount || 0}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-medium"
                >
                  Confirmar Préstamo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Status Modal */}
      {editStatusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditStatusModal(null)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Editar Estado</h3>
            <select
              defaultValue={editStatusModal.currentStatus}
              id="statusSelect"
              className="w-full p-2 mb-4 border border-gray-300 rounded-md"
            >
              <option value="Active">Activo (Sin Préstamo)</option>
              <option value="Active Loan">Préstamo Activo</option>
              <option value="Moroso">Moroso</option>
              <option value="Pending">Pendiente</option>
              <option value="Approved">Aprobado</option>
              <option value="Rejected">Rechazado</option>
              <option value="inactive">Inactivo</option>
            </select>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditStatusModal(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleUpdateStatus(editStatusModal.groupId, document.getElementById('statusSelect').value)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;
