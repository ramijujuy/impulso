import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import AuthContext from "../context/AuthContext";
import { Navigate } from "react-router-dom";

const Loans = () => {
  const { user, loading } = useContext(AuthContext);
  const { token } = useContext(AuthContext); // Ensure token is available if needed for headers
  const [loans, setLoans] = useState([]);
  const [groups, setGroups] = useState([]);
  const [shareholders, setShareholders] = useState([]);
  const [msg, setMsg] = useState(null);

  // Modal de nuevo préstamo
  const [showModal, setShowModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loanAmount, setLoanAmount] = useState("");
  const [numberOfInstallments, setNumberOfInstallments] = useState(3);
  const [selectedShareholders, setSelectedShareholders] = useState([]);

  const [memberAmounts, setMemberAmounts] = useState([]); // Array of { memberId, name, amount }
  const [customStartDate, setCustomStartDate] = useState(new Date().toISOString().split("T")[0]);

  // Loan Filter
  const [filterStatus, setFilterStatus] = useState("Active");

  // Member Details Modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLoanForDetails, setSelectedLoanForDetails] = useState(null);

  useEffect(() => {
    if (user && (user.role === "admin" || user.role === "administrativo")) {
      fetchLoans();
      fetchGroups();
      fetchShareholders();
    }
  }, [user]);

  const fetchLoans = async () => {
    try {
      const res = await axios.get("/api/loans");
      setLoans(res.data.data || []);
    } catch (error) {
      console.error("Error al obtener préstamos:", error);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await axios.get("/api/groups");
      // Filtrar solo grupos aprobados (todos miembros aprobados)
      const approved = res.data.data.filter((g) => {
        const hasMembers = g.members && g.members.length > 0;
        if (!hasMembers) return false;
        return g.members.every((m) => {
          const allChecks =
            m.dniChecked &&
            m.estadoFinancieroChecked &&
            m.carpetaCompletaChecked &&
            m.verificacionChecked;
          const noRejections =
            !m.dniRejection &&
            !m.estadoFinancieroRejection &&
            !m.carpetaCompletaRejection &&
            !m.verificacionRejection;
          return allChecks && noRejections;
        });
      });
      setGroups(approved);
    } catch (error) {
      console.error("Error al obtener grupos:", error);
    }
  };

  const fetchShareholders = async () => {
    try {
      const res = await axios.get("/api/shareholders");
      setShareholders(res.data.data || []);
    } catch (error) {
      console.error("Error al obtener accionistas:", error);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando...</div>;
  if (!user) return <Navigate to="/login" />;
  if (!(user.role === "admin" || user.role === "administrativo"))
    return <Navigate to="/dashboard" />;

  const handleSelectShareholder = (shareholderId, amount) => {
    setSelectedShareholders((prev) => {
      const existing = prev.find((s) => s.shareholderId === shareholderId);
      if (existing) {
        return prev.map((s) =>
          s.shareholderId === shareholderId ? { ...s, amount } : s
        );
      }
      return [...prev, { shareholderId, amount }];
    });
  };

  const handleRemoveShareholder = (shareholderId) => {
    setSelectedShareholders((prev) =>
      prev.filter((s) => s.shareholderId !== shareholderId)
    );
  };

  const totalContributions = selectedShareholders.reduce(
    (sum, s) => sum + (Number(s.amount) || 0),
    0
  );

  const handleCreateLoan = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (!selectedGroup || !loanAmount || !numberOfInstallments) {
      setMsg("Completa todos los campos del préstamo");
      return;
    }

    if (selectedShareholders.length === 0) {
      setMsg("Selecciona al menos un accionista");
      return;
    }

    if (Math.abs(totalContributions - Number(loanAmount)) > 0.01) {
      setMsg(
        `Suma de contribuciones (${totalContributions}) debe igualar monto (${loanAmount})`
      );
      return;
    }

    try {
      // Prepare memberAmounts for API if they have values
      const memberAmountsPayload = memberAmounts.map(m => ({
        memberId: m.memberId,
        amount: Number(m.amount) || 0
      }));

      await axios.post("/api/loans", {
        groupId: selectedGroup,
        amount: Number(loanAmount),
        numberOfInstallments: Number(numberOfInstallments),
        shareholderContributions: selectedShareholders,
        memberAmounts: memberAmountsPayload,
        startDate: customStartDate
      });

      setMsg("✓ Préstamo otorgado correctamente");
      setShowModal(false);
      setSelectedGroup(null);
      setLoanAmount("");
      setNumberOfInstallments(3);
      setSelectedShareholders([]);
      setMemberAmounts([]);
      fetchLoans();
      setTimeout(() => setMsg(null), 3000);
    } catch (error) {
      setMsg(error.response?.data?.error || error.message);
    }
  };

  const handleGroupChange = (e) => {
    const groupId = e.target.value;
    setSelectedGroup(groupId);
    setLoanAmount("");

    if (groupId) {
      const group = groups.find((g) => g._id === groupId);
      if (group && group.members) {
        setMemberAmounts(
          group.members.map((m) => ({
            memberId: m._id,
            name: m.fullName,
            dni: m.dni,
            amount: "",
          }))
        );
      }
    } else {
      setMemberAmounts([]);
    }
  };

  const handleMemberAmountChange = (memberId, value) => {
    const newAmounts = memberAmounts.map((m) =>
      m.memberId === memberId ? { ...m, amount: value } : m
    );
    setMemberAmounts(newAmounts);

    // Auto-calculate total loan amount
    const total = newAmounts.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
    setLoanAmount(total > 0 ? total : "");
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Gestión de Préstamos (Actualizado)</h2>
          <p className="text-gray-500 mt-1">Administra los préstamos otorgados a grupos.</p>
        </div>
        <div className="flex gap-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field max-w-xs border-gray-300 rounded-md text-sm"
          >
            <option value="all">Todos los Estados</option>
            <option value="Active">Activos</option>
            <option value="Paid">Pagados</option>
            <option value="Mora">En Mora</option>
          </select>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Préstamo
          </button>
        </div>
      </div>

      {msg && (
        <div className={`p-4 mb-6 rounded-lg border ${msg.includes("✓") ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {msg}
        </div>
      )}

      {/* Tabla de préstamos */}
      <div className="card bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Grupo</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Monto Total</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Cuotas</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Por Cuota</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Accionistas</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Inicio</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loans
                .filter(l => filterStatus === 'all' || l.status === filterStatus)
                .map((loan) => {
                  const amountPerInstallment =
                    (loan.amount + loan.amount * 0.15 * loan.numberOfInstallments) /
                    loan.numberOfInstallments;
                  return (
                    <tr key={loan._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {loan.group?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 text-right">
                        ${loan.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        {loan.numberOfInstallments}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500 text-right">
                        ${amountPerInstallment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        <div className="space-y-1">
                          {loan.shareholders?.map((s) => (
                            <div key={s.shareholder?._id}>
                              <span className="font-medium">{s.shareholder?.fullName}</span>: ${s.contributionAmount?.toLocaleString()}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${loan.status === 'Active' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                          {loan.status === 'Active' ? 'Activo' : loan.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(loan.startDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => {
                            setSelectedLoanForDetails(loan);
                            setShowDetailsModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Ver Detalle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              {loans.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    No hay préstamos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de nuevo préstamo */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Otorgar Nuevo Préstamo</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleCreateLoan} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grupo (Aprobados)</label>
                  <select
                    value={selectedGroup || ""}
                    onChange={handleGroupChange}
                    className="input-field w-full p-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">-- Selecciona un grupo --</option>
                    {groups.map((g) => (
                      <option key={g._id} value={g._id}>
                        {g.name} ({g.members?.length || 0} miembros)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Inicio</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="input-field w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>

                {selectedGroup && memberAmounts.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Distribución por Miembro</h4>
                    <div className="space-y-3">
                      {memberAmounts.map((member) => (
                        <div key={member.memberId} className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{member.name}</p>
                            <p className="text-xs text-gray-500">{member.dni}</p>
                          </div>
                          <div>
                            <input
                              type="number"
                              placeholder="Monto"
                              value={member.amount}
                              onChange={(e) => handleMemberAmountChange(member.memberId, e.target.value)}
                              className="w-32 p-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-right"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monto a Prestar</label>
                    <input
                      type="number"
                      value={loanAmount}
                      readOnly
                      placeholder="0"
                      className="input-field w-full p-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">Calculado automáticamente (suma de miembros)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cuotas (2-6)</label>
                    <select
                      value={numberOfInstallments}
                      onChange={(e) => setNumberOfInstallments(e.target.value)}
                      className="input-field w-full p-2 border border-gray-300 rounded-md"
                    >
                      {[2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>{n} cuotas</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Cálculo de interés */}
                {loanAmount && numberOfInstallments && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Monto base:</span>
                      <span className="font-medium">${Number(loanAmount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Interés total (15% × {numberOfInstallments}):</span>
                      <span className="font-medium text-green-600">
                        +${(Number(loanAmount) * 0.15 * Number(numberOfInstallments)).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200 font-bold">
                      <span>Total a devolver:</span>
                      <span>
                        ${(Number(loanAmount) * (1 + 0.15 * Number(numberOfInstallments))).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-blue-600 font-medium">
                      <span>Valor cuota:</span>
                      <span>
                        ${((Number(loanAmount) * (1 + 0.15 * Number(numberOfInstallments))) / Number(numberOfInstallments)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Accionistas Intervinientes</label>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar border border-gray-200 rounded-lg p-3">
                    {shareholders.map((sh) => {
                      const isSelected = selectedShareholders.some((s) => s.shareholderId === sh._id);
                      const contribution = selectedShareholders.find((s) => s.shareholderId === sh._id)?.amount || 0;

                      return (
                        <div
                          key={sh._id}
                          className={`flex items-center justify-between p-3 rounded-lg border transition ${isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) handleSelectShareholder(sh._id, 0);
                                else handleRemoveShareholder(sh._id);
                              }}
                              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{sh.fullName}</p>
                              <p className="text-xs text-gray-500">DNI: {sh.dni}</p>
                            </div>
                          </div>
                          {isSelected && (
                            <input
                              type="number"
                              placeholder="Monto"
                              value={contribution}
                              onChange={(e) => handleSelectShareholder(sh._id, Number(e.target.value))}
                              className="w-32 p-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 text-right"
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Resumen contribuciones */}
                {selectedShareholders.length > 0 && (
                  <div className={`p-4 rounded-lg border text-sm ${Math.abs(totalContributions - Number(loanAmount || 0)) < 0.01
                    ? "bg-green-50 border-green-200"
                    : "bg-yellow-50 border-yellow-200"
                    }`}>
                    <div className="flex justify-between items-center font-medium mb-2">
                      <span>Total Contribuido:</span>
                      <span className={Math.abs(totalContributions - Number(loanAmount || 0)) < 0.01 ? "text-green-700" : "text-yellow-700"}>
                        ${totalContributions.toLocaleString()} / ${Number(loanAmount || 0).toLocaleString()}
                      </span>
                    </div>
                    {Math.abs(totalContributions - Number(loanAmount || 0)) < 0.01 ? (
                      <p className="text-green-600 text-xs flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Montos coinciden correctamente
                      </p>
                    ) : (
                      <p className="text-yellow-600 text-xs">
                        Faltan ${(Number(loanAmount || 0) - totalContributions).toLocaleString()} para cubrir el préstamo
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-medium shadow-sm"
                    disabled={Math.abs(totalContributions - Number(loanAmount || 0)) > 0.01}
                  >
                    Confirmar Préstamo
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Modal Detalle Miembros */}
      {showDetailsModal && selectedLoanForDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailsModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Detalle de Préstamo - {selectedLoanForDetails.group?.name}</h3>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="p-6">
              <h4 className="font-semibold text-gray-700 mb-4">Estado de Cuentas por Miembro</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 font-medium text-gray-500">Miembro</th>
                      <th className="p-3 font-medium text-gray-500 text-right">Monto Prestado</th>
                      <th className="p-3 font-medium text-gray-500 text-center">Cuotas</th>
                      <th className="p-3 font-medium text-gray-500 text-right">Saldo Deuda</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedLoanForDetails.memberDetails && selectedLoanForDetails.memberDetails.map((detail, idx) => {
                      const totalDebt = detail.installments?.reduce((sum, inst) => sum + (inst.amount || 0), 0) || 0;
                      const pendingDebt = detail.installments?.filter(i => i.status !== 'paid').reduce((sum, inst) => sum + (inst.amount || 0), 0) || 0;

                      return (
                        <tr key={idx}>
                          <td className="p-3">{detail.member?.fullName || "Desconocido"}</td>
                          <td className="p-3 text-right font-mono">${detail.amountPerPerson?.toLocaleString()}</td>
                          <td className="p-3 text-center">{detail.installments?.length}</td>
                          <td className="p-3 text-right font-mono font-bold text-red-600">${pendingDebt.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                    {!selectedLoanForDetails.memberDetails && (
                      <tr><td colSpan="4" className="p-4 text-center text-gray-500">No hay detalles disponibles.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 flex justify-end">
                <button onClick={() => setShowDetailsModal(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Loans;
