import { useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { Layout } from "./components/Layout";
export function App() {
  const { user, loading } = useAuth();
  if (loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",color:"var(--muted)"}}>Laden...</div>;
  if (!user) return <LoginPage />;
  return <Layout />;
}
