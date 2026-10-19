import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import StoreContextProvider from "./context/StoreContext.jsx";
import axios from "axios";

// Automatically attach JWT token to outgoing API requests if available
axios.interceptors.request.use((config) => {
  const staffToken = localStorage.getItem("staff_token");
  const userToken = localStorage.getItem("token");
  const token = staffToken || userToken;
  if (token && !config.headers.token && !config.headers.Authorization) {
    config.headers.token = token;
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <StoreContextProvider> 
      <App />
    </StoreContextProvider>
  </BrowserRouter>
);
