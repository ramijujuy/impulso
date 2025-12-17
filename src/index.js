import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import axios from "axios";
import reportWebVitals from "./reportWebVitals";

// Configurar la URL base de la API
// Usa la variable de entorno REACT_APP_API_URL si existe, de lo contrario usa la URL de producción de Vercel
axios.defaults.baseURL = process.env.REACT_APP_API_URL || "https://financieraback.vercel.app";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
