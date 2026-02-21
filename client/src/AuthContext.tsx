import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

type AuthState = {
    isAuthenticated: boolean | null;
    isLoading: boolean;
};

type AuthContextType = AuthState & {
    login: (password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<boolean>;
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
    const [authState, setAuthState] = useState<AuthState>({
        isAuthenticated: null,
        isLoading: true,
    });

    const checkAuthMutation = useMutation({
        mutationFn: async (): Promise<boolean> => {
            const res = await fetch(`${SERVER_URL}/api/me`, {
                credentials: "include",
            });
            if (res.status === 401) {
                return false;
            }
            const data = (await res.json()) as MeResponse;
            return data.success && data.data?.authenticated === true;
        },
    });

    const checkAuth = useCallback(async (): Promise<boolean> => {
        const result = await checkAuthMutation.mutateAsync();
        setAuthState({ isAuthenticated: result, isLoading: false });
        return result;
    }, [checkAuthMutation]);

    const loginMutation = useMutation({
        mutationFn: async (password: string): Promise<boolean> => {
            const res = await fetch(`${SERVER_URL}/api/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ password }),
                credentials: "include",
            });
            const data = (await res.json()) as LoginResponse;
            return data.success;
        },
    });

    const login = useCallback(
        async (password: string): Promise<boolean> => {
            const result = await loginMutation.mutateAsync(password);
            if (result) {
                setAuthState({ isAuthenticated: true, isLoading: false });
            }
            return result;
        },
        [loginMutation]
    );

    const logoutMutation = useMutation({
        mutationFn: async (): Promise<void> => {
            await fetch(`${SERVER_URL}/api/logout`, {
                method: "POST",
                credentials: "include",
            });
        },
    });

    const logout = useCallback(async (): Promise<void> => {
        await logoutMutation.mutateAsync();
        setAuthState({ isAuthenticated: false, isLoading: false });
    }, [logoutMutation]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    return (
        <AuthContext.Provider
            value={{
                ...authState,
                login,
                logout,
                checkAuth,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
