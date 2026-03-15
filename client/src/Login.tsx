import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { useTranslation } from "./i18n/index";
import "./Login.css";

export default function Login() {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsSubmitting(true);

        try {
            const success = await login(password);
            if (success) {
                navigate("/");
            } else {
                setError(t("auth.invalidPassword"));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : t("auth.loginFailed"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <img src="/banner.png" alt={t("app.name")} className="login-banner" />
                <p>{t("app.tagline")}</p>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="password">{t("auth.password")}</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t("auth.passwordPlaceholder")}
                            required
                            autoFocus
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="login-button"
                    >
                        {isSubmitting ? t("auth.signingIn") : t("auth.signIn")}
                    </button>
                </form>
            </div>
        </div>
    );
}
