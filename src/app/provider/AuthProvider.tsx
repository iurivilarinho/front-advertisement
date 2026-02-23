import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { queryClient } from "./TanStackQueryProvider";
import type { UserProfileApiDTO } from "../../api/dtos/user";
import {
  useGetUserProfile,
  useLogin,
  useLogout,
  type LoginRequest,
} from "../../api/services/useAuthService";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/dialog/Dialog";
import { Button } from "../../components/button/button";
import { setOnSessionExpired } from "../../api/clients/advertisementApi";

interface AuthContextType {
  user: UserProfileApiDTO | null;
  login: (payload: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfileApiDTO | null>(null);
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);
  const [session, setSession] = useState<{
    isExpired: boolean;
    reason: "logout" | "timeout" | "";
  }>({
    isExpired: false,
    reason: "",
  });

  const { mutateAsync: login, isPending: isLoggingIn } = useLogin();
  const { mutateAsync: logout, isPending: isLoggingOut } = useLogout();
  const { mutateAsync: getUserProfile, isPending: isGettingUserProfile } =
    useGetUserProfile();

  const isLoading =
    isLoggingIn || isLoggingOut || isGettingUserProfile || !isAuthInitialized;

  const expireSession = (reason: "logout" | "timeout") => {
    setUser(null);
    queryClient.clear();

    setSession({
      isExpired: true,
      reason,
    });
  };

  const handleLogin = async (payload: LoginRequest) => {
    const userProfile = await login(payload);
    setUser(userProfile);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      expireSession("logout");
    }
  };

  const refreshUserProfile = async () => {
    try {
      const userProfile = await getUserProfile();
      setUser(userProfile);
    } catch (error) {}
  };

  useEffect(() => {
    setOnSessionExpired(() => {
      expireSession("timeout");
    });

    const init = async () => {
      try {
        await refreshUserProfile();
      } finally {
        setIsAuthInitialized(true);
      }
    };

    init();

    return () => {
      setOnSessionExpired(() => {});
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, login: handleLogin, logout: handleLogout, isLoading }}
    >
      {children}
      {session.isExpired && session.reason === "timeout" && !isLoading && (
        <Dialog open>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sessão expirada</DialogTitle>
            </DialogHeader>
            <p>Sua sessão expirou. Por favor, faça login novamente.</p>
            <DialogFooter>
              <Button
                onClick={() => setSession({ isExpired: false, reason: "" })}
              >
                OK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  return context;
};
