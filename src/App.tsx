import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { AppLayout } from "./components/AppLayout";
import { useSession } from "./hooks/useSession";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { SettingsPage } from "./pages/SettingsPage";
import { UnderConstructionPage } from "./pages/UnderConstructionPage";
import "./styles.css";

function App() {
  const session = useSession();

  if (session === undefined) {
    return <div className="app-loading" aria-busy="true" />;
  }
  if (!session) return <LoginPage />;

  return (
    <BrowserRouter>
      <Routes>
        {/* Keyed by user so switching accounts never shows the previous farm's data. */}
        <Route
          element={<AppLayout key={session.user.id} session={session} />}
        >
          <Route index element={<DashboardPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path=":section" element={<UnderConstructionPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
