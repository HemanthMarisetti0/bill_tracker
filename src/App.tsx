import { useAuth } from "./context/useAuth";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

import Loader from "./components/Loader";

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loader variant="page" message="Getting things ready..." />;
  }

  return user ? (
    <Dashboard />
  ) : (
    <Login />
  );
}

export default App;
