import { useAuth } from "./useAuth.js";
import { useToast } from "./Toast.jsx";
import AuthPage from "./AuthPage.jsx";
import Dashboard from "./Dashboard.jsx";

export default function App() {
  const auth = useAuth();
  const toast = useToast();

  if (!auth.user) {
    return <AuthPage auth={auth} toast={toast} />;
  }

  return <Dashboard user={auth.user} onLogout={auth.logout} toast={toast} />;
}
