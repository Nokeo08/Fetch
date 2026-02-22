import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { templatesApi, type TemplateWithItems } from "./api/templates";
import "./Templates.css";

export default function Templates() {
    const navigate = useNavigate();
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
                showToast(res.error || "Failed to load templates", "error");
            }
        } catch {
            showToast("Failed to load templates", "error");
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

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
                showToast("Template added successfully");
                navigate(`/templates/${newTemplate.id}`);
            } else {
                showToast(res.error || "Failed to create template", "error");
            }
        } catch {
            showToast("Failed to create template", "error");
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
                setTemplates((prev) => prev.filter((t) => t.id !== deletingTemplate.id));
                setShowDeleteModal(false);
                setDeletingTemplate(null);
                showToast("Template deleted");
            } else {
                showToast(res.error || "Failed to delete template", "error");
            }
        } catch {
            showToast("Failed to delete template", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <div className="loading">Loading templates...</div>;
    }

    return (
        <div className="templates-page">
            <div className="templates-header">
                <button className="back-btn" onClick={() => navigate("/")}>
                ← Back to Lists
            </button>
                <h1>Templates</h1>
                <button className="create-btn" onClick={openCreateModal}>
                + Add Template
            </button>
            </div>

            {templates.length === 0 ? (
                <div className="templates-empty">
                    <p>No templates yet</p>
                    <p className="templates-empty-hint">Create a template to quickly populate your shopping lists</p>
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
                                <span>{template.items.length} items</span>
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
                                        <span className="preview-more">+{template.items.length - 3} more</span>
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
                                    Edit
                                </button>
                                <button
                                    className="delete-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openDeleteModal(template);
                                    }}
                                >
                                    Delete
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
                        <h2>Add Template</h2>
                        <div className="modal-form">
                            <div className="form-group">
                                <label htmlFor="template-name">Name</label>
                                <input
                                    id="template-name"
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="e.g., Weekly Groceries"
                                    maxLength={100}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowCreateModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="submit-btn"
                                onClick={handleCreate}
                                disabled={!formName.trim() || isSubmitting}
                            >
                                {isSubmitting ? "Adding..." : "Add"}
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
                        <h2>Delete Template?</h2>
                        <p>Are you sure you want to delete "{deletingTemplate.name}"?</p>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowDeleteModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="submit-btn danger-btn"
                                onClick={handleDelete}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
        </div>
    );
}
