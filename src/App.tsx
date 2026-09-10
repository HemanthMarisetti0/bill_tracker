import { useAuth } from "./context/useAuth";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading">
        Loading...
      </div>
    );
  }

  return user ? (
    <Dashboard />
  ) : (
    <Login />
  );
}

export default App;
