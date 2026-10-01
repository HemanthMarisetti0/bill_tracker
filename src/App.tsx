import { lazy, Suspense } from "react";

import { useAuth } from "./context/useAuth";

import Loader from "./components/Loader";

/*
 * Loaded on demand so the login page
 * doesn't download the dashboard.
 */
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loader variant="page" message="Getting things ready..." />;
  }

  return (
    <Suspense
      fallback={<Loader variant="page" message="Getting things ready..." />}>
      {/* Keyed so switching accounts starts with fresh state. */}
      {user ? <Dashboard key={user.uid} /> : <Login />}
    </Suspense>
  );
}

export default App;
