import { createContext, useContext, useState, useEffect, useCallback } from "react";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

type AuthContextType = {
    isAuthenticated: boolean | null;
    isLoading: boolean;
    login: (password: string) => Promise<boolean>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

type MeResponse = {
    success: boolean;
    data?: {
        authenticated: boolean;
    };
};

type LoginResponse = {
    success: boolean;
    data?: {
        message: string;
    };
    error?: string;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<{
        isAuthenticated: boolean | null;
        isLoading: boolean;
    }>({
        isAuthenticated: null,
        isLoading: true,
    });

    useEffect(() => {
        let mounted = true;

        async function checkAuth() {
            try {
                const res = await fetch(`${SERVER_URL}/api/me`, {
                    credentials: "include",
                });
                if (!mounted) return;

                if (res.status === 401) {
                    setState({ isAuthenticated: false, isLoading: false });
                    return;
                }

                const data = (await res.json()) as MeResponse;
                setState({
                    isAuthenticated: data.success && data.data?.authenticated === true,
                    isLoading: false,
                });
            } catch {
                if (mounted) {
                    setState({ isAuthenticated: false, isLoading: false });
                }
            }
        }

        checkAuth();

        return () => {
            mounted = false;
        };
    }, []);

    const login = useCallback(async (password: string): Promise<boolean> => {
        try {
            const res = await fetch(`${SERVER_URL}/api/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ password }),
                credentials: "include",
            });
            const data = (await res.json()) as LoginResponse;
            if (data.success) {
                setState({ isAuthenticated: true, isLoading: false });
            }
            return data.success;
        } catch {
            return false;
        }
    }, []);

    const logout = useCallback(async (): Promise<void> => {
        try {
            await fetch(`${SERVER_URL}/api/logout`, {
                method: "POST",
                credentials: "include",
            });
        } finally {
            setState({ isAuthenticated: false, isLoading: false });
        }
    }, []);

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated: state.isAuthenticated,
                isLoading: state.isLoading,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
