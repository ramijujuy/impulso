import { useState, useEffect, useContext } from "react";
import axios from "axios";
import AuthContext from "../context/AuthContext";

const Shareholders = () => {
  const { token } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("list"); // list | profits
  const [shareholders, setShareholders] = useState([]);
  const [selectedShareholder, setSelectedShareholder] = useState(null);
  const [shareholderAccount, setShareholderAccount] = useState(null);

  // Profit View State
  const [profits, setProfits] = useState([]);
  const [profitStartDate, setProfitStartDate] = useState("");

  const [profitEndDate, setProfitEndDate] = useState("");
  const [profitType, setProfitType] = useState("realized"); // realized | projected

  const [formData, setFormData] = useState({
    fullName: "",
    dni: "",
    email: "",
    phone: "",
    capitalContributed: 0,
  });
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState(null);

  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchShareholders();
  }, [token]);

  const fetchShareholders = async () => {
    try {
      const res = await axios.get("/api/shareholders", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShareholders(res.data.data);
    } catch (error) {
      console.error(error);
      setMsg("❌ Error al cargar accionistas");
    }
  };

  const fetchShareholderAccount = async (shareholderId) => {
    try {
      const res = await axios.get(`/api/shareholders/${shareholderId}/account`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShareholderAccount(res.data.data);
    } catch (error) {
      console.error(error);
      setMsg("❌ Error al cargar cuenta del accionista");
    }
  };

  const fetchProfits = async () => {
    try {
      let url = "/api/shareholders/profits";
      const params = new URLSearchParams();
      if (profitStartDate) params.append("startDate", profitStartDate);

      if (profitEndDate) params.append("endDate", profitEndDate);
      if (profitType) params.append("type", profitType);

      const res = await axios.get(`${url}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfits(res.data.data);
    } catch (error) {
      console.error(error);
      setMsg("❌ Error al cargar ganancias");
    }
  };

  const handleSelectShareholder = (shareholder) => {
    setSelectedShareholder(shareholder);
    fetchShareholderAccount(shareholder._id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (editingId) {
        await axios.put(`/api/shareholders/${editingId}`, {
          ...formData,
          contactInfo: { email: formData.email, phone: formData.phone },
        }, config);
        setMsg("✓ Accionista actualizado");
      } else {
        await axios.post("/api/shareholders", {
          ...formData,
          contactInfo: { email: formData.email, phone: formData.phone },
        }, config);
        setMsg("✓ Accionista creado");
      }
      setFormData({
        fullName: "",
        dni: "",
        email: "",
        phone: "",
        capitalContributed: 0,
      });
      setEditingId(null);
      setShowCreateForm(false);
      fetchShareholders();
      setTimeout(() => setMsg(null), 3000);
    } catch (error) {
      console.error(error);
      setMsg(
        `❌ Error: ${error.response?.data?.error || "No se pudo guardar"}`
      );
    }
  };

  const handleEdit = (s) => {
    setFormData({
      fullName: s.fullName,
      dni: s.dni,
      email: s.contactInfo?.email || "",
      phone: s.contactInfo?.phone || "",
      capitalContributed: s.capitalContributed,
    });
    setEditingId(s._id);
    setShowCreateForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Está seguro de eliminar este accionista?")) {
      try {
        await axios.delete(`/api/shareholders/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchShareholders();
      } catch (error) {
        console.error(error);
      }
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Gestión de Accionistas</h2>
          <p className="text-gray-500 mt-1">Administre los accionistas y consulte sus estados de cuenta.</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({ fullName: "", dni: "", email: "", phone: "", capitalContributed: 0 });
              setShowCreateForm(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Accionista
          </button>
          <div className="flex space-x-3 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === "list"
                ? "bg-primary-50 text-primary-700 shadow-sm ring-1 ring-primary-200"
                : "text-gray-600 hover:bg-gray-50"
                }`}
              onClick={() => setActiveTab("list")}
            >
              Listado y Cuentas
            </button>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === "profits"
                ? "bg-primary-50 text-primary-700 shadow-sm ring-1 ring-primary-200"
                : "text-gray-600 hover:bg-gray-50"
                }`}
              onClick={() => {
                setActiveTab("profits");
                fetchProfits();
              }}
            >
              Ganancias
            </button>
          </div>
        </div>
      </div>

      {msg && (
        <div className={`p-4 mb-6 rounded-lg border ${msg.includes("✓") ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          <div className="flex items-center gap-2">
            <span>{msg}</span>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateForm(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">
                {editingId ? "Editar Accionista" : "Registrar Nuevo Accionista"}
              </h3>
              <button onClick={() => setShowCreateForm(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                    <input
                      type="text"
                      className="input-field w-full p-2 border border-gray-300 rounded-md"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      required
                      placeholder="Ej. Juan Pérez"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">DNI</label>
                    <input
                      type="text"
                      className="input-field w-full p-2 border border-gray-300 rounded-md"
                      value={formData.dni}
                      onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                      required
                      placeholder="Sin puntos"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      className="input-field w-full p-2 border border-gray-300 rounded-md"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="correo@ejemplo.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <input
                      type="text"
                      className="input-field w-full p-2 border border-gray-300 rounded-md"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+54 ..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Capital Aportado ($)</label>
                    <input
                      type="number"
                      className="input-field w-full p-2 border border-gray-300 rounded-md"
                      value={formData.capitalContributed}
                      onChange={(e) => setFormData({ ...formData, capitalContributed: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
                    {editingId ? "Actualizar Accionista" : "Guardar Accionista"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === "list" && (
        <div className="flex flex-col xl:flex-row gap-8">
          <div className="flex-1 space-y-8">
            <div className="card bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">Listado de Accionistas</h3>
                <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">{shareholders.length} Total</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">DNI</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Capital</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Capital Activo</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Ganancia Proy.</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {shareholders.map((s) => (
                      <tr
                        key={s._id}
                        className={`hover:bg-gray-50 transition ${selectedShareholder?._id === s._id ? "bg-blue-50/50" : ""}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{s.fullName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{s.dni}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">${s.capitalContributed.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">${s.activeCapital?.toLocaleString() || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-green-600 font-medium">${s.projectedProfit?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleSelectShareholder(s)}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            Ver Cuenta
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => handleEdit(s)}
                            className="text-gray-600 hover:text-gray-900 hover:underline"
                          >
                            Editar
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => handleDelete(s._id)}
                            className="text-red-600 hover:text-red-800 hover:underline"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {shareholders.length === 0 && (
                      <tr>
                        <td colSpan="4" className="p-8 text-center text-gray-500">No hay accionistas registrados.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {shareholderAccount && (
            <div className="xl:w-96 flex-shrink-0">
              <div className="card p-6 sticky top-6 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">{shareholderAccount.fullName}</h3>
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Activo</span>
                </div>

                <div className="space-y-4 text-sm mb-8">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-500">DNI</span>
                    <span className="font-semibold text-gray-900">{shareholderAccount.dni}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-500">Capital Inicial</span>
                    <span className="font-mono font-semibold text-gray-900">${shareholderAccount.capitalContributed.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-500">Total Contribuido</span>
                    <span className="font-mono font-semibold text-gray-900">${shareholderAccount.totalContributed.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-500">Préstamos Activos</span>
                    <span className="font-semibold text-gray-900">{shareholderAccount.numberOfLoans}</span>
                  </div>
                </div>

                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                  Contribuciones Recientes
                </h4>

                {shareholderAccount.contributions && shareholderAccount.contributions.length > 0 ? (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {shareholderAccount.contributions.map((contrib, idx) => (
                      <div key={idx} className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-gray-900 text-sm">{contrib.groupName}</span>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${contrib.loanStatus === 'Active' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                            {contrib.loanStatus === 'Active' ? 'Activo' : contrib.loanStatus}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                          <div>
                            <p className="mb-1">Aporte</p>
                            <p className="font-mono text-gray-900 font-medium">${contrib.contributionAmount.toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="mb-1">Cobro Estimado</p>
                            <p className="font-mono text-green-600 font-medium">${contrib.futureCollection.toLocaleString()}</p>
                            <div className="text-[10px] text-gray-500 flex flex-col items-end">
                              <span>Cap: ${contrib.capital.toLocaleString()}</span>
                              <span>Int: ${contrib.interest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <p className="text-gray-500 text-sm">No hay contribuciones registradas</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "profits" && (
        <div className="card p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="flex flex-wrap gap-4 items-end mb-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Ganancia</label>
              <select
                value={profitType}
                onChange={(e) => setProfitType(e.target.value)}
                className="input-field w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="realized">Ganancias Realizadas (Pagadas)</option>
                <option value="projected">Proyección Futura (Vencimientos)</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Desde</label>
              <input
                type="date"
                value={profitStartDate}
                onChange={(e) => setProfitStartDate(e.target.value)}
                className="input-field w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Hasta</label>
              <input
                type="date"
                value={profitEndDate}
                onChange={(e) => setProfitEndDate(e.target.value)}
                className="input-field w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <button
              onClick={fetchProfits}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              {profitType === 'projected' ? 'Calcular Proyección' : 'Filtrar Ganancias'}
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Accionista</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">DNI</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Cap. Recuperado</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Interés Ganado</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Ganancia Total</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {profits.map((p, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.shareholder.fullName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.shareholder.dni}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700 text-right">
                      ${p.totalCapitalRecovered?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 text-right">
                      ${p.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600 text-right">
                      ${(p.totalProfit + (p.totalCapitalRecovered || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <details className="group inline-block text-left">
                        <summary className="cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 justify-center">
                          <span>Ver {p.details.length} pagos</span>
                          <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </summary>
                        <div className="absolute mt-2 w-64 bg-white p-3 rounded-lg shadow-xl border border-gray-100 z-10 max-h-60 overflow-y-auto right-10">
                          <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Desglose de Pagos</h5>
                          {p.details.map((d, i) => (
                            <div key={i} className="flex justify-between py-2 border-b border-gray-100 last:border-0 text-xs text-right gap-2">
                              <span className="text-gray-600 text-left w-20">
                                {profitType === 'projected'
                                  ? `Vence: ${new Date(d.dueDate).toLocaleDateString()}`
                                  : `Pagado: ${new Date(d.paidDate).toLocaleDateString()}`}
                              </span>
                              <span className="text-gray-500" title="Capital">Cap: ${d.capitalRecovered?.toFixed(2)}</span>
                              <span className="font-medium text-green-600" title="Interés">Int: +${d.profit.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
                {profits.length === 0 && (
                  <tr>
                    <td colSpan="4" className="py-12 text-center text-gray-500">
                      No se encontraron ganancias en el rango seleccionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shareholders;
