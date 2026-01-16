import { useState, useEffect, useContext } from "react";
import { useLocation } from "react-router-dom";
import AuthContext from "../context/AuthContext";
import Modal from "../components/Modal";
import Receipt from "../components/Receipt";
import * as XLSX from "xlsx";
import axios from "axios";

const CurrentAccounts = () => {
    const { token } = useContext(AuthContext);
    const location = useLocation();
    const personId = new URLSearchParams(location.search).get('personId');
    const [activeTab, setActiveTab] = useState("accounts"); // accounts | collections
    const [accounts, setAccounts] = useState([]);
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Filters
    const [filterDate, setFilterDate] = useState("all"); // all, next7, thisMonth, overdue
    const [filterGroup, setFilterGroup] = useState("all");
    const [groups, setGroups] = useState([]);
    const [collectionStartDate, setCollectionStartDate] = useState("");
    const [collectionEndDate, setCollectionEndDate] = useState("");

    // Modal for Payment
    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedInstallment, setSelectedInstallment] = useState(null);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
    const [paymentObservation, setPaymentObservation] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("transfer"); // transfer | cash

    // Receipt Modal
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [receiptData, setReceiptData] = useState(null);

    // Modal for Edit Date
    const [showEditDateModal, setShowEditDateModal] = useState(false);
    const [newDueDate, setNewDueDate] = useState("");

    // Modal for Group Details
    const [showGroupDetailsModal, setShowGroupDetailsModal] = useState(false);
    const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);

    // Custom Date Range for Accounts Filter
    const [customStartDate, setCustomStartDate] = useState("");
    const [customEndDate, setCustomEndDate] = useState("");

    const [viewType, setViewType] = useState("person"); // person | group

    useEffect(() => {
        fetchGroups();
        if (activeTab === "accounts") {
            fetchAccounts();
        } else {
            fetchCollections();
        }
    }, [activeTab, filterDate, personId]); // Re-fetch when tab, filter, or personId changes

    const fetchGroups = async () => {
        try {
            const res = await axios.get("/api/groups");
            if (res.data.success) {
                setGroups(res.data.data);
            }
        } catch (err) {
            console.error("Error fetching groups", err);
        }
    };

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const res = await axios.get("/api/current-accounts");
            if (res.data.success) {
                let accountsData = res.data.data;
                if (personId) {
                    accountsData = accountsData.filter(acc => acc.accountType === 'person' && acc.person && acc.person._id === personId);
                }
                setAccounts(accountsData);
            } else {
                setError(res.data.error);
            }
        } catch (err) {
            setError("Error al cargar cuentas");
        } finally {
            setLoading(false);
        }
    };

    const fetchCollections = async () => {
        setLoading(true);
        try {
            const params = {};
            if (collectionStartDate) params.startDate = collectionStartDate;
            if (collectionEndDate) params.endDate = collectionEndDate;

            const res = await axios.get("/api/current-accounts/collections", { params });
            if (res.data.success) {
                setCollections(res.data.data);
            } else {
                setError(res.data.error);
            }
        } catch (err) {
            setError("Error al cargar cobranzas");
        } finally {
            setLoading(false);
        }
    };

    const handlePayClick = (account, installment) => {
        setSelectedAccount(account);
        setSelectedInstallment(installment);
        // setPaymentDate(new Date().toISOString().split("T")[0]); // Duplicate removal
        setPaymentDate(new Date().toISOString().split("T")[0]);
        setPaymentObservation("");
        setPaymentMethod("transfer");
        setShowPayModal(true);
    };

    const handleEditDateClick = (account, installment) => {
        setSelectedAccount(account);
        setSelectedInstallment(installment);
        setNewDueDate(installment.dueDate ? new Date(installment.dueDate).toISOString().split("T")[0] : "");
        setShowEditDateModal(true);
    };

    const confirmEditDate = async () => {
        if (!selectedAccount || !selectedInstallment || !newDueDate) return;

        try {
            const res = await axios.put(`/api/current-accounts/${selectedAccount._id}/installments/${selectedInstallment.installmentNumber}`, {
                dueDate: newDueDate
            });
            if (res.data.success) {
                setShowEditDateModal(false);
                fetchAccounts(); // Refresh
            } else {
                alert(res.data.error || "Error al actualizar fecha");
            }
        } catch (err) {
            console.error(err);
            alert("Error al conectar con el servidor");
        }
    };

    const handleViewGroupDetails = (groupAccount) => {
        const groupId = groupAccount.group._id;
        const members = accounts.filter(acc => acc.accountType === 'person' && acc.person?.group?._id === groupId);
        setSelectedGroupMembers(members);
        setSelectedAccount(groupAccount);
        setShowGroupDetailsModal(true);
    };

    const confirmPayment = async () => {
        if (!selectedAccount || !selectedInstallment) return;
        try {
            const res = await axios.put(
                `/api/current-accounts/${selectedAccount._id}/installments/${selectedInstallment.installmentNumber}`,
                {
                    amountPaid: selectedInstallment.amount - (selectedInstallment.amountPaid || 0),
                    paidDate: paymentDate,
                    observation: paymentObservation,
                }
            );
            if (res.data.success) {
                setShowPayModal(false);

                // Generate Receipt Data
                setReceiptData({
                    receiptNumber: Math.floor(Math.random() * 10000), // Placeholder for now
                    date: paymentDate,
                    amount: selectedInstallment.amount - (selectedInstallment.amountPaid || 0),
                    payerName: selectedAccount.person ? selectedAccount.person.fullName : selectedAccount.group?.name,
                    installmentNumber: selectedInstallment.installmentNumber,
                    paymentMethod: paymentMethod
                });
                setShowReceiptModal(true);

                fetchAccounts(); // Refresh list
            } else {
                alert(res.data.error);
            }
        } catch (err) {
            alert("Error al procesar pago");
        }
    };

    // Filter logic for accounts view
    const getFilteredInstallments = (account) => {
        if (!account.installments) return [];

        const now = new Date();
        const next7 = new Date();
        next7.setDate(now.getDate() + 7);
        const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        return account.installments.filter(inst => {
            const dueDate = new Date(inst.dueDate);
            dueDate.setHours(0, 0, 0, 0);

            if (filterDate === 'overdue') {
                return dueDate < now && inst.status !== 'paid';
            }
            if (filterDate === 'next7') {
                return dueDate >= now && dueDate <= next7 && inst.status !== 'paid';
            }
            if (filterDate === 'thisMonth') {
                return dueDate >= startMonth && dueDate <= endMonth && inst.status !== 'paid';
            }
            if (filterDate === 'custom' && customStartDate && customEndDate) {
                const start = new Date(customStartDate);
                const end = new Date(customEndDate);
                end.setHours(23, 59, 59, 999);
                return dueDate >= start && dueDate <= end;
            }
            return true; // 'all' shows everything including paid
        });
    };

    const handleExport = () => {
        const dataToExport = [];

        if (activeTab === "accounts") {
            accounts.forEach(acc => {
                // Apply view type filter
                if (acc.accountType !== viewType) return;

                // Apply group filter
                if (filterGroup !== "all") {
                    if (acc.accountType === 'group' && acc.group?._id !== filterGroup) return;
                    if (acc.accountType === 'person' && acc.person?.group?._id !== filterGroup) return;
                }

                const visibleInstallments = getFilteredInstallments(acc);
                visibleInstallments.forEach(inst => {
                    dataToExport.push({
                        Tipo: acc.accountType === 'person' ? 'Individual' : 'Grupal',
                        Nombre: acc.person ? acc.person.fullName : acc.group?.name,
                        Grupo: acc.person?.group?.name || acc.group?.name || "-",
                        "Cuota #": inst.installmentNumber,
                        Vencimiento: new Date(inst.dueDate).toLocaleDateString(),
                        Monto: inst.amount,
                        "Monto Pagado": inst.status === 'paid' ? inst.amount : (inst.amountPaid || 0),
                        "Fecha Pago": inst.paidDate ? new Date(inst.paidDate).toLocaleDateString() : "Impaga",
                        Estado: inst.status
                    });
                });
            });
            XLSX.writeFile(XLSX.utils.json_to_sheet(dataToExport), `cuentas_${viewType === 'person' ? 'individuales' : 'grupales'}.xlsx`);
        } else {
            // Export collections
            collections.forEach(col => {
                dataToExport.push({
                    "Fecha Pago": new Date(col.installment.paidDate).toLocaleDateString(),
                    Cliente: col.person ? col.person.fullName : col.group?.name,
                    "Cuota #": col.installment.installmentNumber,
                    Monto: col.installment.amount
                });
            });
            XLSX.writeFile(XLSX.utils.json_to_sheet(dataToExport), "cobranzas.xlsx");
        }
    }


    const handlePrintReceipt = () => {
        const printContent = document.getElementById('receipt-print');
        const windowUrl = 'about:blank';
        const uniqueName = new Date();
        const windowName = 'Print' + uniqueName.getTime();
        const printWindow = window.open(windowUrl, windowName, 'left=50000,top=50000,width=0,height=0');

        printWindow.document.write(printContent.outerHTML);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Cuentas Corrientes</h2>
                    <p className="text-gray-500 mt-1">Gestione las cuentas corrientes y registre los pagos.</p>
                </div>
                <div className="flex space-x-3 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                    <button
                        className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === "accounts"
                            ? "bg-primary-50 text-primary-700 shadow-sm ring-1 ring-primary-200"
                            : "text-gray-600 hover:bg-gray-50"
                            }`}
                        onClick={() => setActiveTab("accounts")}
                    >
                        Cuentas y Pagos
                    </button>
                    <button
                        className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === "collections"
                            ? "bg-primary-50 text-primary-700 shadow-sm ring-1 ring-primary-200"
                            : "text-gray-600 hover:bg-gray-50"
                            }`}
                        onClick={() => setActiveTab("collections")}
                    >
                        Reporte de Cobranzas
                    </button>
                </div>
                <button
                    onClick={handleExport}
                    className="ml-4 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition shadow-sm"
                >
                    Exportar Excel
                </button>
            </div>

            {error && (
                <div className="p-4 mb-6 rounded-lg border bg-red-50 border-red-200 text-red-800">
                    <div className="flex items-center gap-2">
                        <span>{error}</span>
                    </div>
                </div>
            )}

            {activeTab === "accounts" && (
                <>
                    <div>
                        <div className="mb-4 flex space-x-4 border-b border-gray-200 pb-2">
                            <button
                                className={`pb-2 px-1 text-sm font-medium transition relative ${viewType === 'person' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                                onClick={() => setViewType('person')}
                            >
                                Cuentas Individuales
                            </button>
                            <button
                                className={`pb-2 px-1 text-sm font-medium transition relative ${viewType === 'group' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                                onClick={() => setViewType('group')}
                            >
                                Cuentas Grupales
                            </button>
                        </div>

                        <div className="mb-8 flex flex-wrap items-center gap-2 overflow-x-auto pb-2">
                            {['all', 'next7', 'thisMonth', 'overdue', 'custom'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilterDate(f)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${filterDate === f
                                        ? "bg-primary-600 text-white shadow-md"
                                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                                        }`}
                                >
                                    {f === 'all' && 'Todas'}
                                    {f === 'next7' && 'Próximos 7 días'}
                                    {f === 'thisMonth' && 'Este Mes'}
                                    {f === 'overdue' && 'Vencidas'}
                                    {f === 'custom' && 'Rango Personalizado'}
                                </button>
                            ))}
                            {filterDate === 'custom' && (
                                <div className="flex items-center gap-2 ml-2 bg-white p-1 rounded-lg border border-gray-200">
                                    <input
                                        type="date"
                                        value={customStartDate}
                                        onChange={e => setCustomStartDate(e.target.value)}
                                        className="px-2 py-1 text-sm border-none focus:ring-0 text-gray-600"
                                    />
                                    <span className="text-gray-400">-</span>
                                    <input
                                        type="date"
                                        value={customEndDate}
                                        onChange={e => setCustomEndDate(e.target.value)}
                                        className="px-2 py-1 text-sm border-none focus:ring-0 text-gray-600"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Grupo</label>
                            <select
                                value={filterGroup}
                                onChange={(e) => setFilterGroup(e.target.value)}
                                className="input-field max-w-xs"
                            >
                                <option value="all">Todos los grupos</option>
                                {groups.map(g => (
                                    <option key={g._id} value={g._id}>{g.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>


                    <div className="grid gap-6">
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                                <p className="text-gray-500">Cargando cuentas...</p>
                            </div>
                        ) : (
                            accounts.map((acc) => {
                                // Apply view type filter
                                if (acc.accountType !== viewType) return null;

                                // Apply group filter
                                if (filterGroup !== "all") {
                                    if (acc.accountType === 'group' && acc.group?._id !== filterGroup) return null;
                                    if (acc.accountType === 'person' && acc.person?.group?._id !== filterGroup) return null;
                                }

                                const visibleInstallments = getFilteredInstallments(acc);
                                if (visibleInstallments.length === 0 && filterDate !== 'all') return null;

                                return (
                                    <div key={acc._id} className="card">
                                        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                                    {acc.person ? acc.person.fullName : acc.group?.name}
                                                    {acc.accountType === 'group' && (
                                                        <button
                                                            onClick={() => handleViewGroupDetails(acc)}
                                                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition"
                                                        >
                                                            Ver Miembros
                                                        </button>
                                                    )}
                                                </h3>
                                                <p className="text-sm text-gray-500">
                                                    {acc.accountType === 'person' ? 'Individual' : 'Grupal'} • Total: <span className="font-mono font-medium text-gray-700">${acc.totalAmount.toLocaleString()}</span>
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${acc.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {acc.status === 'active' ? 'Activa' : acc.status}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="divide-y divide-gray-100">
                                            {visibleInstallments.length > 0 ? visibleInstallments.map((inst) => (
                                                <div key={inst.installmentNumber} className={`p-4 flex flex-col sm:flex-row justify-between items-center transition gap-4 ${inst.status === 'paid' ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'}`}>
                                                    <div className="flex items-center space-x-4 w-full sm:w-auto">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${inst.status === 'paid' ? 'bg-green-200 text-green-800' : 'bg-primary-50 text-primary-700'}`}>
                                                            {inst.installmentNumber}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900">Cuota #{inst.installmentNumber}</p>
                                                            <p className="text-sm text-gray-500">
                                                                Vence: {new Date(inst.dueDate).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                                        <span className="font-bold text-gray-900 font-mono">${inst.amount.toLocaleString()}</span>
                                                        <div className="flex gap-2">
                                                            {inst.status === 'paid' ? (
                                                                <span className="px-3 py-1 bg-green-200 text-green-800 text-sm font-medium rounded shadow-sm">
                                                                    Pagada {inst.paidDate ? `(${new Date(inst.paidDate).toLocaleDateString()})` : ''}
                                                                </span>
                                                            ) : (
                                                                <>
                                                                    <button
                                                                        onClick={() => handlePayClick(acc, inst)}
                                                                        className="px-3 py-1 bg-primary-600 text-white text-sm font-medium rounded hover:bg-primary-700 transition shadow-sm"
                                                                    >
                                                                        Pagar
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleEditDateClick(acc, inst)}
                                                                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                                                        title="Editar Fecha"
                                                                    >
                                                                        ✎
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                            )) : (
                                                <div className="p-8 text-center text-gray-400 text-sm">
                                                    No hay cuotas que coincidan con el filtro seleccionado.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        {
                            !loading && accounts.length === 0 && (
                                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                                    <p className="text-gray-500">No se encontraron cuentas corrientes.</p>
                                </div>
                            )
                        }
                    </div >
                </>
            )}


            {
                activeTab === "collections" && (
                    <div className="card p-6">
                        <div className="flex flex-wrap gap-4 items-end mb-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
                                <input
                                    type="date"
                                    value={collectionStartDate}
                                    onChange={(e) => setCollectionStartDate(e.target.value)}
                                    className="input-field"
                                />
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
                                <input
                                    type="date"
                                    value={collectionEndDate}
                                    onChange={(e) => setCollectionEndDate(e.target.value)}
                                    className="input-field"
                                />
                            </div>
                            <button
                                onClick={fetchCollections}
                                className="btn-primary"
                            >
                                Filtrar Reporte
                            </button>
                        </div>

                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="table-header">Fecha Pago</th>
                                        <th className="table-header">Cliente</th>
                                        <th className="table-header">Cuota</th>
                                        <th className="table-header text-right">Monto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {collections.map((col, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition">
                                            <td className="table-cell text-gray-900">
                                                {new Date(col.installment.paidDate).toLocaleDateString()}
                                            </td>
                                            <td className="table-cell font-medium text-gray-900">
                                                {col.person ? col.person.fullName : col.group?.name}
                                            </td>
                                            <td className="table-cell text-gray-500">
                                                #{col.installment.installmentNumber}
                                            </td>
                                            <td className="table-cell font-bold text-gray-900 text-right font-mono">
                                                ${col.installment.amount.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {collections.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="py-12 text-center text-gray-500">
                                                No se encontraron cobros en este rango.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {
                showPayModal && (
                    <Modal title="Registrar Pago" onClose={() => setShowPayModal(false)}>
                        <div className="space-y-6">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <p className="text-blue-800 text-sm">
                                    Registrando pago para <strong className="font-semibold">{selectedAccount?.person?.fullName || selectedAccount?.group?.name}</strong>
                                </p>
                                <p className="text-blue-600 text-xs mt-1">
                                    Cuota #{selectedInstallment?.installmentNumber} • Vencimiento: {new Date(selectedInstallment?.dueDate).toLocaleDateString()}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Pago</label>
                                <input
                                    type="date"
                                    value={paymentDate}
                                    onChange={(e) => setPaymentDate(e.target.value)}
                                    className="input-field"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pago</label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="input-field"
                                >
                                    <option value="transfer">Transferencia</option>
                                    <option value="cash">Efectivo</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Observación (Opcional)</label>
                                <textarea
                                    value={paymentObservation}
                                    onChange={(e) => setPaymentObservation(e.target.value)}
                                    className="input-field min-h-[100px]"
                                    placeholder="Detalles adicionales del pago..."
                                ></textarea>
                            </div>

                            <div className="flex justify-end space-x-3 pt-2">
                                <button
                                    onClick={() => setShowPayModal(false)}
                                    className="btn-secondary"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmPayment}
                                    className="btn-primary bg-green-600 hover:bg-green-700 focus:ring-green-500"
                                >
                                    Confirmar Pago
                                </button>
                            </div>
                        </div>
                    </Modal>
                )
            }

            {
                showEditDateModal && (
                    <Modal title="Editar Fecha de Vencimiento" onClose={() => setShowEditDateModal(false)}>
                        <div className="space-y-4">
                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                                <p className="text-yellow-800 text-sm">
                                    Editando cuota #{selectedInstallment?.installmentNumber} de <strong className="font-semibold">{selectedAccount?.person?.fullName || selectedAccount?.group?.name}</strong>
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Fecha de Vencimiento</label>
                                <input
                                    type="date"
                                    value={newDueDate}
                                    onChange={e => setNewDueDate(e.target.value)}
                                    className="input-field"
                                />
                            </div>
                            <div className="flex justify-end space-x-3 pt-2">
                                <button onClick={() => setShowEditDateModal(false)} className="btn-secondary">Cancelar</button>
                                <button onClick={confirmEditDate} className="btn-primary">Guardar Cambios</button>
                            </div>
                        </div>
                    </Modal>
                )
            }

            {
                showGroupDetailsModal && (
                    <Modal title={`Detalle de Grupo: ${selectedAccount?.group?.name}`} onClose={() => setShowGroupDetailsModal(false)}>
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            <p className="text-sm text-gray-500 mb-4">Estado de cuentas individuales de los miembros.</p>
                            {selectedGroupMembers.length > 0 ? (
                                <div className="space-y-3">
                                    {selectedGroupMembers.map(memberAcc => {
                                        const pending = memberAcc.installments.filter(i => i.status !== 'paid').length;
                                        const overdue = memberAcc.installments.filter(i => i.status !== 'paid' && new Date(i.dueDate) < new Date()).length;
                                        const totalDebt = memberAcc.installments.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.amount, 0);

                                        return (
                                            <div key={memberAcc._id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-bold text-gray-900">{memberAcc.person.fullName}</h4>
                                                        <p className="text-xs text-gray-500">DNI: {memberAcc.person.dni}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-sm font-bold text-red-600">${totalDebt.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                                <div className="mt-2 flex gap-2 text-xs mb-2">
                                                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">Pendientes: {pending}</span>
                                                    <span className={`px-2 py-1 rounded ${overdue > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                        Vencidas: {overdue}
                                                    </span>
                                                </div>

                                                <details className="mt-2">
                                                    <summary className="text-xs text-blue-600 cursor-pointer hover:underline">Ver Cuotas</summary>
                                                    <div className="mt-2 space-y-1">
                                                        {memberAcc.installments.map(inst => (
                                                            <div key={inst.installmentNumber} className="flex justify-between text-xs border-b border-gray-100 py-1">
                                                                <span>#{inst.installmentNumber} - {new Date(inst.dueDate).toLocaleDateString()}</span>
                                                                <div className="text-right">
                                                                    <span className="font-mono block">${inst.amount.toLocaleString()}</span>
                                                                    <span className={`font-medium ${inst.status === 'paid' ? 'text-green-600' :
                                                                        inst.status === 'partial' ? 'text-orange-600' :
                                                                            inst.status === 'overdue' ? 'text-red-600' : 'text-gray-600'
                                                                        }`}>
                                                                        {inst.status === 'paid' ? 'Pagada' :
                                                                            inst.status === 'partial' ? `Parcial ($${inst.amountPaid?.toLocaleString() || 0})` :
                                                                                inst.status === 'overdue' ? 'Vencida' : 'Pendiente'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </details>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 py-4">No se encontraron miembros con cuenta activa.</p>
                            )}
                            <div className="flex justify-end pt-4 border-t border-gray-100 mt-4">
                                <button onClick={() => setShowGroupDetailsModal(false)} className="btn-secondary">Cerrar</button>
                            </div>
                        </div>
                    </Modal>
                )
            }

            {
                showReceiptModal && (
                    <Modal title="Comprobante de Pago" onClose={() => setShowReceiptModal(false)}>
                        <div className="flex flex-col items-center">
                            <div className="overflow-auto max-w-full mb-4 border p-2">
                                <Receipt data={receiptData} />
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setShowReceiptModal(false)} className="btn-secondary">Cerrar</button>
                                <button onClick={handlePrintReceipt} className="btn-primary">Imprimir Recibo</button>
                            </div>
                        </div>
                    </Modal>
                )
            }
        </div >
    );
};

export default CurrentAccounts;
