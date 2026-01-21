import React, { useContext, useState } from "react";
import { Link } from "react-router-dom";
import AuthContext from "../context/AuthContext";
import * as XLSX from "xlsx";

const Home = () => {
  const { user, token } = useContext(AuthContext);
  const [backupLoading, setBackupLoading] = useState(false);

  const stats = [
    {
      label: "Grupos Activos",
      value: "Ver",
      link: "/dashboard/groups",
      color: "bg-blue-500",
    },
    {
      label: "Préstamos",
      value: "Gestionar",
      link: "/dashboard/loans",
      color: "bg-green-500",
    },
    {
      label: "Cuentas Corrientes",
      value: "Revisar",
      link: "/dashboard/current-accounts",
      color: "bg-purple-500",
    },
    {
      label: "Accionistas",
      value: "Listado",
      link: "/dashboard/shareholders",
      color: "bg-orange-500",
    },
  ];

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // DEBUG ALERT (Requested)
      alert("Iniciando Backup... (V3 FIXED)");

      // Base URL configuration (matches logic in src/index.js)
      const API_URL =
        process.env.REACT_APP_API_URL || "https://financieraback.vercel.app";

      // Helper to handle fetch errors
      const fetchJson = async (endpoint) => {
        const url = `${API_URL}${endpoint}`;
        const res = await fetch(url, { headers });
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch (e) {
          console.error(`Error parsing JSON from ${url}:`, text.slice(0, 100));
          throw new Error(
            `Error en ${url}: Recibido HTML/Texto en lugar de JSON. Inicio: ${text.slice(0, 20)}...`,
          );
        }
      };

      // Fetch all data in parallel
      const [
        usersRes,
        personsRes,
        groupsRes,
        loansRes,
        accountsRes,
        shareholdersRes,
      ] = await Promise.all([
        fetchJson("/api/users"),
        fetchJson("/api/persons"),
        fetchJson("/api/groups"),
        fetchJson("/api/loans"),
        fetchJson("/api/current-accounts"),
        fetchJson("/api/shareholders"),
      ]);

      const wb = XLSX.utils.book_new();

      // 1. Users Sheet
      if (usersRes.success) {
        const usersData = usersRes.data.map((u) => ({
          ID: u._id,
          Username: u.username,
          Role: u.role,
          CreatedAt: u.createdAt,
        }));
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(usersData),
          "Usuarios",
        );
      }

      // 2. Persons Sheet
      if (personsRes.success) {
        const personsData = personsRes.data.map((p) => ({
          ID: p._id,
          Name: p.fullName,
          DNI: p.dni,
          Address: p.address,
          Group: p.group?.name || "-",
          Status: p.status,
          FinancialStatus: p.financialStatus,
          Checks: `DNI:${p.dniChecked ? "Y" : "N"}, Fin:${
            p.estadoFinancieroChecked ? "Y" : "N"
          }, Carp:${p.carpetaCompletaChecked ? "Y" : "N"}, Bol:${
            p.boletaServicioChecked ? "Y" : "N"
          }, Gar:${p.garanteChecked ? "Y" : "N"}, Ver:${
            p.verificacionChecked ? "Y" : "N"
          }`,
        }));
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(personsData),
          "Personas",
        );
      }

      // 3. Groups Sheet
      if (groupsRes.success) {
        const groupsData = groupsRes.data.map((g) => ({
          ID: g._id,
          Name: g.name,
          Status: g.status,
          MembersCount: g.members?.length || 0,
          TotalDebt: g.totalDebt,
        }));
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(groupsData),
          "Grupos",
        );
      }

      // 4. Loans Sheet
      if (loansRes.success) {
        const loansData = loansRes.data.map((l) => ({
          ID: l._id,
          Group: l.group?.name,
          Amount: l.amount,
          Installments: l.numberOfInstallments,
          Status: l.status,
          StartDate: new Date(l.startDate).toLocaleDateString(),
        }));
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(loansData),
          "Prestamos",
        );
      }

      // 5. Shareholders Sheet
      if (shareholdersRes.success) {
        const shData = shareholdersRes.data.map((s) => ({
          ID: s._id,
          Name: s.fullName,
          DNI: s.dni,
          CurrentCapital: s.currentCapital,
        }));
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(shData),
          "Accionistas",
        );
      }

      // 6. Current Accounts Summary
      if (accountsRes.success) {
        const accData = accountsRes.data.map((a) => ({
          ID: a._id,
          Type: a.accountType,
          Owner: a.person ? a.person.fullName : a.group?.name,
          TotalAmount: a.totalAmount,
          Status: a.status,
          InstallmentsCount: a.installments?.length,
        }));
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(accData),
          "CuentasCorrientes",
        );

        // 7. Detailed Installments Sheet
        const allInstallments = [];
        accountsRes.data.forEach((acc) => {
          const ownerName = acc.person ? acc.person.fullName : acc.group?.name;
          if (acc.installments) {
            acc.installments.forEach((inst) => {
              allInstallments.push({
                AccountID: acc._id,
                Owner: ownerName,
                Type: acc.accountType,
                InstallmentNum: inst.installmentNumber,
                DueDate: new Date(inst.dueDate).toLocaleDateString(),
                PaidDate: inst.paidDate
                  ? new Date(inst.paidDate).toLocaleDateString()
                  : "-",
                Status: inst.status,
                Amount: inst.amount,
                AmountPaid:
                  inst.status === "paid" ? inst.amount : inst.amountPaid || 0,
                Observation: inst.observation || "",
              });
            });
          }
        });
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(allInstallments),
          "DetalleCuotas",
        );
      }

      // Download
      const dateStr = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `BACKUP_SISTEMA_${dateStr}.xlsx`);
    } catch (error) {
      console.error(error);
      alert("Error al generar backup: " + error.message);
    } finally {
      setBackupLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Bienvenido, {user?.username}
          </h1>
          <p className="text-gray-500 mt-2">
            Panel de control general de la financiera.
          </p>
        </div>
        <button
          onClick={handleBackup}
          disabled={backupLoading}
          className={`px-4 py-2 rounded-lg font-medium text-white shadow-sm flex items-center gap-2 ${
            backupLoading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {backupLoading ? (
            "Generando..."
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Descargar Backup Completo
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <Link
            key={index}
            to={stat.link}
            className="block bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-500 text-sm font-medium">
                {stat.label}
              </h3>
              <div className={`w-3 h-3 rounded-full ${stat.color}`}></div>
            </div>
            <div className="flex items-baseline">
              <span className="text-2xl font-bold text-gray-900">
                {stat.value}
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Accesos Rápidos
          </h3>
          <div className="space-y-3">
            <Link
              to="/dashboard/groups"
              className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
            >
              <span className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full mr-3">
                👥
              </span>
              <div>
                <p className="font-medium text-gray-900">Gestionar Grupos</p>
                <p className="text-xs text-gray-500">
                  Crear grupos, editar miembros
                </p>
              </div>
            </Link>
            <Link
              to="/dashboard/loans"
              className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
            >
              <span className="w-8 h-8 flex items-center justify-center bg-green-100 text-green-600 rounded-full mr-3">
                💰
              </span>
              <div>
                <p className="font-medium text-gray-900">Otorgar Préstamo</p>
                <p className="text-xs text-gray-500">
                  Crear nuevos préstamos para grupos
                </p>
              </div>
            </Link>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-lg p-6 text-white">
          <h3 className="text-lg font-bold mb-2">Estado del Sistema</h3>
          <p className="text-slate-300 text-sm mb-6">
            El sistema está funcionando correctamente. Todas las conexiones
            seguras están activas.
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span>En línea</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
