import { createContext, useContext } from "react";

type AuthContextType = {
    isAuthenticated: boolean | null;
    isLoading: boolean;
    login: (password: string) => Promise<boolean>;
    logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
