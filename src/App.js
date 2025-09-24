import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./helpers/Login";
import Register from "./helpers/Register";          // <- from earlier step
import ResetPassword from "./helpers/ResetPassword"; // <- from earlier step
import Dashboard from "./helpers/Dashboard";
import { LangProvider } from "./helpers/i18n";

function PrivateRoute({ token, children }) {
  return token ? children : <Navigate to="/" replace />;
}

export default function App() {
  const [token, setToken] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const t = localStorage.getItem("demo_auth_token");
    if (t) setToken(t);
  }, []);

  const handleSuccess = (t) => {
    localStorage.setItem("demo_auth_token", t);
    setToken(t);
    navigate("/app"); // go to dashboard after OTP step
  };

  const handleLogout = () => {
    localStorage.removeItem("demo_auth_token");
    setToken(null);
    navigate("/");    // back to login
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
              onSuccess={() => navigate("/")} // after mock registration
            />
          }
        />
        <Route
          path="/forgot"
          element={
            <ResetPassword
              onCancel={() => navigate("/")}
              onSuccess={() => navigate("/")} // after mock reset
            />
          }
        />

        {/* Private (guarded) */}
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
