// App.jsx
import { useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./helpers/Login";
import Register from "./helpers/Register";
import ResetPassword from "./helpers/ResetPassword";
import Dashboard from "./helpers/Dashboard";
import { LangProvider } from "./helpers/i18n";

function PrivateRoute({ token, children }) {
  return token ? children : <Navigate to="/" replace />;
}

export default function App() {
  // ✅ read once, before first render
  const [token, setToken] = useState(() => localStorage.getItem("demo_auth_token"));
  const navigate = useNavigate();

  const handleSuccess = (t) => {
    localStorage.setItem("demo_auth_token", t);
    setToken(t);
    navigate("/app");
  };

  const handleLogout = () => {
    localStorage.removeItem("demo_auth_token");
    setToken(null);
    navigate("/");
  };

  return (
    <LangProvider>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Login onSuccess={handleSuccess} />} />
        <Route
          path="/register"
          element={
            <Register
              onCancel={() => navigate("/")}
              onSuccess={() => navigate("/")}
            />
          }
        />
        <Route
          path="/forgot"
          element={
            <ResetPassword
              onCancel={() => navigate("/")}
              onSuccess={() => navigate("/")}
            />
          }
        />

        {/* Private */}
        <Route
          path="/app/*"
          element={
            <PrivateRoute token={token}>
              <Dashboard onLogout={handleLogout} />
            </PrivateRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to={token ? "/app" : "/"} replace />} />
      </Routes>
    </LangProvider>
  );
}
