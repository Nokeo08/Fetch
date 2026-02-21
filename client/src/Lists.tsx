import { useState, useEffect, useCallback } from "react";
import { listsApi, type ListWithCounts } from "./api/lists";
import "./Lists.css";

const EMOJI_OPTIONS = ["📋", "🛒", "🏠", "🏭", "🏪", "🎯", "⭐", "❤️", "🎉", "🔥", "💡", "🎁", "🌟", "✨", "🚀"];

type Toast = {
    message: string;
    type: "success" | "error";
};

export default function Lists() {
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

    const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    const fetchLists = useCallback(async () => {
        try {
            const res = await listsApi.getAll();
            if (res.success && res.data) {
                setLists(res.data);
            } else {
                setError(res.error || "Failed to load lists");
            }
        } catch {
            setError("Failed to load lists");
        } finally {
            setIsLoading(false);
        }
    }, []);

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
                showToast("List created successfully");
            } else {
                showToast(res.error || "Failed to create list", "error");
            }
        } catch {
            showToast("Failed to create list", "error");
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
                showToast("List updated successfully");
            } else {
                showToast(res.error || "Failed to update list", "error");
            }
        } catch {
            showToast("Failed to update list", "error");
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
                showToast("List deleted successfully");
            } else {
                showToast(res.error || "Failed to delete list", "error");
            }
        } catch {
            showToast("Failed to delete list", "error");
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
                showToast("List activated");
            } else {
                showToast(res.error || "Failed to activate list", "error");
            }
        } catch {
            showToast("Failed to activate list", "error");
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
                showToast("Failed to save order", "error");
            }
        }
        setDraggedId(null);
    };

    if (isLoading) {
        return <div className="loading">Loading lists...</div>;
    }

    return (
        <div className="lists-page">
            <div className="lists-header">
                <h1>Shopping Lists</h1>
                <button className="create-btn" onClick={openCreateModal}>
                    + New List
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {lists.length === 0 ? (
                <div className="lists-empty">
                    <p>No shopping lists yet. Click "+ New List" to get started!</p>
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
                        >
                            <div className="list-card-header">
                                <span className="drag-handle">⋮⋮</span>
                                <span className="list-icon">{list.icon}</span>
                                <span className="list-name">{list.name}</span>
                                {list.isActive && <span className="list-active-badge">Active</span>}
                            </div>

                            <div className="list-meta">
                                <span>{list.itemCount} items</span>
                                <span>{list.sectionCount} sections</span>
                            </div>

                            <div className="list-actions">
                                <button className="edit-btn" onClick={() => openEditModal(list)}>
                                    Edit
                                </button>
                                {!list.isActive && (
                                    <button className="activate-btn" onClick={() => handleActivate(list)}>
                                        Activate
                                    </button>
                                )}
                                <button
                                    className="delete-btn"
                                    onClick={() => openDeleteModal(list)}
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
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Create New List</h2>
                        <div className="modal-form">
                            <div className="form-group">
                                <label htmlFor="name">Name</label>
                                <input
                                    id="name"
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="Enter list name"
                                    maxLength={100}
                                    autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label>Icon</label>
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
                                Cancel
                            </button>
                            <button
                                className="submit-btn"
                                onClick={handleCreate}
                                disabled={!formName.trim() || isSubmitting}
                            >
                                {isSubmitting ? "Creating..." : "Create"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showEditModal && editingList && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Edit List</h2>
                        <div className="modal-form">
                            <div className="form-group">
                                <label htmlFor="edit-name">Name</label>
                                <input
                                    id="edit-name"
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="Enter list name"
                                    maxLength={100}
                                    autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label>Icon</label>
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
                                Cancel
                            </button>
                            <button
                                className="submit-btn"
                                onClick={handleEdit}
                                disabled={!formName.trim() || isSubmitting}
                            >
                                {isSubmitting ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteModal && deletingList && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal delete-confirm" onClick={(e) => e.stopPropagation()}>
                        <h2>Delete List?</h2>
                        <p>Are you sure you want to delete "{deletingList.name}"?</p>
                        {(deletingList.itemCount > 0 || deletingList.sectionCount > 0) && (
                            <p className="warning">
                                This will also delete {deletingList.itemCount} items and {deletingList.sectionCount} sections.
                            </p>
                        )}
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
