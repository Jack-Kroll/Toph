import { useSession } from "./hooks/useSession";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import "./styles.css";

function App() {
  const session = useSession();

  if (session === undefined) {
    return <div className="app-loading" aria-busy="true" />;
  }
  if (!session) return <LoginPage />;
  // Keyed by user so switching accounts never shows the previous farm's data.
  return <DashboardPage key={session.user.id} session={session} />;
}

export default App;
