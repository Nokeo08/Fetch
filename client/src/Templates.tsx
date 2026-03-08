import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { templatesApi, type TemplateWithItems } from "./api/templates";
import { useTranslation } from "./i18n/index";
import "./Templates.css";

export default function Templates() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [templates, setTemplates] = useState<TemplateWithItems[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingTemplate, setDeletingTemplate] = useState<TemplateWithItems | null>(null);

    const [formName, setFormName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const deleteModalRef = useRef<HTMLDivElement>(null);
    const createModalRef = useRef<HTMLDivElement>(null);

    const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    useEffect(() => {
        if (showDeleteModal && deleteModalRef.current) {
            deleteModalRef.current.focus();
        }
    }, [showDeleteModal]);

    useEffect(() => {
        if (showCreateModal && createModalRef.current) {
            createModalRef.current.focus();
        }
    }, [showCreateModal]);

    const fetchTemplates = useCallback(async () => {
        try {
            const res = await templatesApi.getAll();
            if (res.success && res.data) {
                setTemplates(res.data);
            } else {
                showToast(res.error || t("templates.failedToLoad"), "error");
            }
        } catch {
            showToast(t("templates.failedToLoad"), "error");
        } finally {
            setIsLoading(false);
        }
    }, [showToast, t]);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const openCreateModal = () => {
        setFormName("");
        setShowCreateModal(true);
    };

    const openDeleteModal = (template: TemplateWithItems) => {
        setDeletingTemplate(template);
        setShowDeleteModal(true);
    };

    const handleCreate = async () => {
        if (!formName.trim()) return;

        setIsSubmitting(true);
        try {
            const res = await templatesApi.create(formName.trim());
            if (res.success && res.data) {
                const newTemplate: TemplateWithItems = { ...res.data!, items: [] };
                setTemplates((prev) => [...prev, newTemplate]);
                setShowCreateModal(false);
                showToast(t("templates.addedSuccess"));
                navigate(`/templates/${newTemplate.id}`);
            } else {
                showToast(res.error || t("templates.failedToCreate"), "error");
            }
        } catch {
            showToast(t("templates.failedToCreate"), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingTemplate) return;

        setIsSubmitting(true);
        try {
            const res = await templatesApi.delete(deletingTemplate.id);
            if (res.success) {
                setTemplates((prev) => prev.filter((tpl) => tpl.id !== deletingTemplate.id));
                setShowDeleteModal(false);
                setDeletingTemplate(null);
                showToast(t("templates.deletedSuccess"));
            } else {
                showToast(res.error || t("templates.failedToDelete"), "error");
            }
        } catch {
            showToast(t("templates.failedToDelete"), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <div className="loading">{t("templates.loadingTemplates")}</div>;
    }

    return (
        <div className="templates-page">
            <div className="templates-header">
                <button className="back-btn" onClick={() => navigate("/")}>
                ← {t("nav.backToLists")}
            </button>
                <h1>{t("templates.title")}</h1>
                <button className="create-btn" onClick={openCreateModal}>
                {t("templates.addTemplate")}
            </button>
            </div>

            {templates.length === 0 ? (
                <div className="templates-empty">
                    <p>{t("templates.emptyState")}</p>
                    <p className="templates-empty-hint">{t("templates.emptyHint")}</p>
                </div>
            ) : (
                <div className="templates-grid">
                    {templates.map((template) => (
                        <div
                            key={template.id}
                            className="template-card"
                            onClick={() => navigate(`/templates/${template.id}`)}
                        >
                            <div className="template-card-header">
                                <span className="template-name">{template.name}</span>
                            </div>
                            <div className="template-meta">
                                <span>{t("common.items", { count: template.items.length })}</span>
                                <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                            </div>
                            {template.items.length > 0 && (
                                <div className="template-preview">
                                    {template.items.slice(0, 3).map((item) => (
                                        <span key={item.id} className="preview-item">
                                            {item.name}
                                        </span>
                                    ))}
                                    {template.items.length > 3 && (
                                        <span className="preview-more">{t("templates.moreItems", { count: template.items.length - 3 })}</span>
                                    )}
                                </div>
                            )}
                            <div className="template-actions">
                                <button
                                    className="edit-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/templates/${template.id}`);
                                    }}
                                >
                                    {t("common.edit")}
                                </button>
                                <button
                                    className="delete-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openDeleteModal(template);
                                    }}
                                >
                                    {t("common.delete")}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div
                        ref={createModalRef}
                        className="modal"
                        tabIndex={-1}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && formName.trim() && !isSubmitting) {
                                handleCreate();
                            }
                            if (e.key === "Escape") {
                                setShowCreateModal(false);
                            }
                        }}
                    >
                        <h2>{t("templates.addTemplateTitle")}</h2>
                        <div className="modal-form">
                            <div className="form-group">
                                <label htmlFor="template-name">{t("common.name")}</label>
                                <input
                                    id="template-name"
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder={t("templates.templateNamePlaceholder")}
                                    maxLength={100}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowCreateModal(false)}>
                                {t("common.cancel")}
                            </button>
                            <button
                                className="submit-btn"
                                onClick={handleCreate}
                                disabled={!formName.trim() || isSubmitting}
                            >
                                {isSubmitting ? t("common.adding") : t("common.add")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteModal && deletingTemplate && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div
                        ref={deleteModalRef}
                        className="modal delete-confirm"
                        tabIndex={-1}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !isSubmitting) {
                                handleDelete();
                            }
                            if (e.key === "Escape") {
                                setShowDeleteModal(false);
                            }
                        }}
                    >
                        <h2>{t("templates.deleteTemplate")}</h2>
                        <p>{t("templates.deleteConfirm", { name: deletingTemplate.name })}</p>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowDeleteModal(false)}>
                                {t("common.cancel")}
                            </button>
                            <button
                                className="submit-btn danger-btn"
                                onClick={handleDelete}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? t("common.deleting") : t("common.delete")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
        </div>
    );
}
