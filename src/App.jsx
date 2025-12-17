import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthProvider } from "./context/AuthContext";
import AuthContext from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Shareholders from "./pages/Shareholders";
import Groups from "./pages/Groups";
import Loans from "./pages/Loans";
import AdminUsers from "./pages/AdminUsers";
import Persons from "./pages/Persons";
import CurrentAccounts from "./pages/CurrentAccounts";

import Home from "./pages/Home";

const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div>Cargando...</div>;

  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          >
            <Route
              index
              element={<Home />}
            />
            <Route path="shareholders" element={<Shareholders />} />
            <Route path="groups" element={<Groups />} />
            <Route path="admin" element={<AdminUsers />} />
            <Route path="persons" element={<Persons />} />
            <Route path="loans" element={<Loans />} />
            <Route path="current-accounts" element={<CurrentAccounts />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
