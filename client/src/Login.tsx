import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import "./Login.css";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

type LoginResponse = {
    success: boolean;
    data?: {
        message: string;
    };
    error?: string;
};

export default function Login() {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const loginMutation = useMutation({
        mutationFn: async (password: string): Promise<LoginResponse> => {
            const res = await fetch(`${SERVER_URL}/api/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ password }),
                credentials: "include",
            });
            return res.json() as Promise<LoginResponse>;
        },
        onSuccess: (data) => {
            if (data.success) {
                navigate("/");
            } else {
                setError(data.error || "Login failed");
            }
        },
        onError: (err: unknown) => {
            setError(err instanceof Error ? err.message : "Login failed");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        loginMutation.mutate(password);
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1>Fetch</h1>
                <p>Sign in to access your shopping lists</p>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                            autoFocus
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button
                        type="submit"
                        disabled={loginMutation.isPending}
                        className="login-button"
                    >
                        {loginMutation.isPending ? "Signing in..." : "Sign In"}
                    </button>
                </form>
            </div>
        </div>
    );
}
