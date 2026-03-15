import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { listsApi, type ListWithCounts } from "./api/lists";
import { useTranslation } from "./i18n/index";
import "./Lists.css";

const EMOJI_OPTIONS = ["📋", "🛒", "🏠", "🏭", "🏪", "🎯", "⭐", "❤️", "🎉", "🔥", "💡", "🎁", "🌟", "✨", "🚀"];

type Toast = {
    message: string;
    type: "success" | "error";
};

export default function Lists() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [lists, setLists] = useState<ListWithCounts[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [toast, setToast] = useState<Toast | null>(null);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editingList, setEditingList] = useState<ListWithCounts | null>(null);
    const [deletingList, setDeletingList] = useState<ListWithCounts | null>(null);

    const [formName, setFormName] = useState("");
    const [formIcon, setFormIcon] = useState("📋");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [draggedId, setDraggedId] = useState<number | null>(null);

    const deleteModalRef = useRef<HTMLDivElement>(null);

    const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    useEffect(() => {
        if (showDeleteModal && deleteModalRef.current) {
            deleteModalRef.current.focus();
        }
    }, [showDeleteModal]);

    const fetchLists = useCallback(async () => {
        try {
            const res = await listsApi.getAll();
            if (res.success && res.data) {
                setLists(res.data);
            } else {
                setError(res.error || t("lists.failedToLoad"));
            }
        } catch {
            setError(t("lists.failedToLoad"));
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchLists();
    }, [fetchLists]);

    const openCreateModal = () => {
        setFormName("");
        setFormIcon("📋");
        setShowCreateModal(true);
    };

    const openEditModal = (list: ListWithCounts) => {
        setEditingList(list);
        setFormName(list.name);
        setFormIcon(list.icon);
        setShowEditModal(true);
    };

    const openDeleteModal = (list: ListWithCounts) => {
        setDeletingList(list);
        setShowDeleteModal(true);
    };

    const handleCreate = async () => {
        if (!formName.trim()) return;

        setIsSubmitting(true);
        try {
            const res = await listsApi.create(formName.trim(), formIcon);
            if (res.success && res.data) {
                setLists((prev) => [...prev, { ...res.data!, itemCount: 0, sectionCount: 0 }]);
                setShowCreateModal(false);
                showToast(t("lists.addedSuccess"));
            } else {
                showToast(res.error || t("lists.failedToCreate"), "error");
            }
        } catch {
            showToast(t("lists.failedToCreate"), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = async () => {
        if (!editingList || !formName.trim()) return;

        setIsSubmitting(true);
        try {
            const res = await listsApi.update(editingList.id, {
                name: formName.trim(),
                icon: formIcon,
            });
            if (res.success && res.data) {
                setLists((prev) =>
                    prev.map((l) =>
                        l.id === editingList.id ? { ...l, name: res.data!.name, icon: res.data!.icon } : l
                    )
                );
                setShowEditModal(false);
                setEditingList(null);
                showToast(t("lists.updatedSuccess"));
            } else {
                showToast(res.error || t("lists.failedToUpdate"), "error");
            }
        } catch {
            showToast(t("lists.failedToUpdate"), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingList) return;

        setIsSubmitting(true);
        try {
            const res = await listsApi.delete(deletingList.id);
            if (res.success) {
                setLists((prev) => prev.filter((l) => l.id !== deletingList.id));
                setShowDeleteModal(false);
                setDeletingList(null);
                showToast(t("lists.deletedSuccess"));
            } else {
                showToast(res.error || t("lists.failedToDelete"), "error");
            }
        } catch {
            showToast(t("lists.failedToDelete"), "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleActivate = async (list: ListWithCounts) => {
        try {
            const res = await listsApi.activate(list.id);
            if (res.success) {
                setLists((prev) =>
                    prev.map((l) => ({
                        ...l,
                        isActive: l.id === list.id,
                    }))
                );
                showToast(t("lists.activatedSuccess"));
            } else {
                showToast(res.error || t("lists.failedToActivate"), "error");
            }
        } catch {
            showToast(t("lists.failedToActivate"), "error");
        }
    };

    const handleDragStart = (id: number) => {
        setDraggedId(id);
    };

    const handleDragOver = (e: React.DragEvent, targetId: number) => {
        e.preventDefault();
        if (draggedId === null || draggedId === targetId) return;

        const draggedIndex = lists.findIndex((l) => l.id === draggedId);
        const targetIndex = lists.findIndex((l) => l.id === targetId);

        if (draggedIndex === -1 || targetIndex === -1) return;

        const newLists = [...lists];
        const [draggedItem] = newLists.splice(draggedIndex, 1);
        newLists.splice(targetIndex, 0, draggedItem);
        setLists(newLists);
    };

    const handleDragEnd = async () => {
        if (draggedId !== null) {
            const ids = lists.map((l) => l.id);
            try {
                await listsApi.reorder(ids);
            } catch {
                showToast(t("common.failedToSaveOrder"), "error");
            }
        }
        setDraggedId(null);
    };

    if (isLoading) {
        return <div className="loading">{t("lists.loadingLists")}</div>;
    }

    return (
        <div className="lists-page">
            <div className="lists-header">
                <h1>{t("lists.title")}</h1>
                <button className="create-btn" onClick={openCreateModal}>
                    {t("lists.newList")}
                </button>
            </div>
            <button className="create-btn-mobile" onClick={openCreateModal}>
                {t("lists.newList")}
            </button>

            {error && <div className="error-message">{error}</div>}

            {lists.length === 0 ? (
                <div className="lists-empty">
                    <p>{t("lists.emptyState")}</p>
                </div>
            ) : (
                <div className="lists-grid">
                    {lists.map((list) => (
                        <div
                            key={list.id}
                            className={`list-card ${list.isActive ? "active" : ""} ${draggedId === list.id ? "dragging" : ""}`}
                            draggable
                            onDragStart={() => handleDragStart(list.id)}
                            onDragOver={(e) => handleDragOver(e, list.id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => navigate(`/lists/${list.id}`)}
                        >
                            <div className="list-card-header">
                                <span className="drag-handle">⋮⋮</span>
                                <span className="list-icon">{list.icon}</span>
                                <span className="list-name">{list.name}</span>
                                {list.isActive && <span className="list-active-badge">{t("lists.active")}</span>}
                            </div>

                            <div className="list-meta">
                                <span>{list.itemCount !== 1 ? t("common.items", { count: list.itemCount }) : t("common.itemSingular", { count: list.itemCount })}</span>
                                <span>{list.sectionCount !== 1 ? t("common.sections", { count: list.sectionCount }) : t("common.sectionSingular", { count: list.sectionCount })}</span>
                            </div>

                            <div className="list-actions">
                                <button className="edit-btn" onClick={(e) => { e.stopPropagation(); openEditModal(list); }}>
                                    {t("common.edit")}
                                </button>
                                {!list.isActive && (
                                    <button className="activate-btn" onClick={(e) => { e.stopPropagation(); handleActivate(list); }}>
                                        {t("lists.activate")}
                                    </button>
                                )}
                                <button
                                    className="delete-btn"
                                    onClick={(e) => { e.stopPropagation(); openDeleteModal(list); }}
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
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>{t("lists.addList")}</h2>
                        <div className="modal-form">
                            <div className="form-group">
                                <label htmlFor="name">{t("common.name")}</label>
                                <input
                                    id="name"
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && formName.trim() && !isSubmitting) {
                                            handleCreate();
                                        }
                                    }}
                                    placeholder={t("lists.enterListName")}
                                    maxLength={100}
                                    autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label>{t("common.icon")}</label>
                                <div className="icon-picker">
                                    {EMOJI_OPTIONS.map((emoji) => (
                                        <button
                                            key={emoji}
                                            type="button"
                                            className={`icon-option ${formIcon === emoji ? "selected" : ""}`}
                                            onClick={() => setFormIcon(emoji)}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
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

            {showEditModal && editingList && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>{t("lists.editList")}</h2>
                        <div className="modal-form">
                            <div className="form-group">
                                <label htmlFor="edit-name">{t("common.name")}</label>
                                <input
                                    id="edit-name"
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && formName.trim() && !isSubmitting) {
                                            handleEdit();
                                        }
                                    }}
                                    placeholder={t("lists.enterListName")}
                                    maxLength={100}
                                    autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label>{t("common.icon")}</label>
                                <div className="icon-picker">
                                    {EMOJI_OPTIONS.map((emoji) => (
                                        <button
                                            key={emoji}
                                            type="button"
                                            className={`icon-option ${formIcon === emoji ? "selected" : ""}`}
                                            onClick={() => setFormIcon(emoji)}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowEditModal(false)}>
                                {t("common.cancel")}
                            </button>
                            <button
                                className="submit-btn"
                                onClick={handleEdit}
                                disabled={!formName.trim() || isSubmitting}
                            >
                                {isSubmitting ? t("common.saving") : t("common.save")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteModal && deletingList && (
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
                        <h2>{t("lists.deleteList")}</h2>
                        <p>{t("lists.deleteConfirm", { name: deletingList.name })}</p>
                        {(deletingList.itemCount > 0 || deletingList.sectionCount > 0) && (
                            <p className="warning">
                                {t("lists.deleteWarning", { itemCount: deletingList.itemCount, sectionCount: deletingList.sectionCount })}
                            </p>
                        )}
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
