import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  onAuthStateChanged,
  type User,
} from "firebase/auth";

import { auth } from "../lib/firebase";
import { AuthContext } from "./AuthContext";

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}