// App.jsx
import { useEffect, useState } from "react";
import Login from "./helpers/Login";
import Dashboard from "./helpers/Dashboard";
import { LangProvider } from "./helpers/i18n";

export default function App() {
  const [token, setToken] = useState(null);

  useEffect(() => {
    const t = localStorage.getItem("demo_auth_token");
    if (t) setToken(t);
  }, []);

  const handleSuccess = (t) => {
    localStorage.setItem("demo_auth_token", t);
    setToken(t);
  };

  const handleLogout = () => {
    localStorage.removeItem("demo_auth_token");
    setToken(null);
  };

  return (
    <LangProvider>
      {token ? (
        <Dashboard onLogout={handleLogout} />
      ) : (
        <Login onSuccess={handleSuccess} />
      )}
    </LangProvider>
  );
}
