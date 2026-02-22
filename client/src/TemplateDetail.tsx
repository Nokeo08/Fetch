import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { TemplateItem } from "shared/dist";
import { templatesApi, type TemplateWithItems } from "./api/templates";
import "./TemplateDetail.css";

type Toast = {
    message: string;
    type: "success" | "error";
};

type DragState = {
    itemId: number | null;
};

export default function TemplateDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const templateId = id ? parseInt(id, 10) : null;

    const [template, setTemplate] = useState<TemplateWithItems | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<Toast | null>(null);

    const [showEditNameModal, setShowEditNameModal] = useState(false);
    const [showDeleteItemModal, setShowDeleteItemModal] = useState(false);
    const [showEditItemModal, setShowEditItemModal] = useState(false);
    const [deletingItem, setDeletingItem] = useState<TemplateItem | null>(null);
    const [editingItem, setEditingItem] = useState<TemplateItem | null>(null);

    const [templateName, setTemplateName] = useState("");
    const [itemName, setItemName] = useState("");
    const [itemDescription, setItemDescription] = useState("");
    const [itemQuantity, setItemQuantity] = useState("");
    const [itemSectionName, setItemSectionName] = useState("");
    const [newItemName, setNewItemName] = useState("");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dragState, setDragState] = useState<DragState | null>(null);

    const editNameModalRef = useRef<HTMLDivElement>(null);
    const deleteItemModalRef = useRef<HTMLDivElement>(null);
    const editItemModalRef = useRef<HTMLDivElement>(null);

    const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    useEffect(() => {
        if (showEditNameModal && editNameModalRef.current) {
            editNameModalRef.current.focus();
        }
    }, [showEditNameModal]);

    useEffect(() => {
        if (showDeleteItemModal && deleteItemModalRef.current) {
            deleteItemModalRef.current.focus();
        }
    }, [showDeleteItemModal]);

    useEffect(() => {
        if (showEditItemModal && editItemModalRef.current) {
            editItemModalRef.current.focus();
        }
    }, [showEditItemModal]);

    const fetchTemplate = useCallback(async () => {
        if (!templateId) return;

        try {
            const res = await templatesApi.getById(templateId);
            if (res.success && res.data) {
                setTemplate(res.data);
                setTemplateName(res.data.name);
            } else {
                showToast(res.error || "Failed to load template", "error");
            }
        } catch {
            showToast("Failed to load template", "error");
        } finally {
            setIsLoading(false);
        }
    }, [templateId, showToast]);

    useEffect(() => {
        fetchTemplate();
    }, [fetchTemplate]);

    const openEditNameModal = () => {
        if (!template) return;
        setTemplateName(template.name);
        setShowEditNameModal(true);
    };

    const handleUpdateName = async () => {
        if (!template || !templateName.trim()) return;

        setIsSubmitting(true);
        try {
            const res = await templatesApi.update(template.id, templateName.trim());
            if (res.success && res.data) {
                setTemplate((prev) => (prev ? { ...prev, name: res.data!.name } : null));
                setShowEditNameModal(false);
                showToast("Template name updated");
            } else {
                showToast(res.error || "Failed to update template", "error");
            }
        } catch {
            showToast("Failed to update template", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddItem = async () => {
        if (!template || !newItemName.trim()) return;

        try {
            const res = await templatesApi.addItem(template.id, newItemName.trim());
            if (res.success && res.data) {
                setTemplate((prev) =>
                    prev ? { ...prev, items: [...prev.items, res.data!] } : null
                );
                setNewItemName("");
                showToast("Item added");
            } else {
                showToast(res.error || "Failed to add item", "error");
            }
        } catch {
            showToast("Failed to add item", "error");
        }
    };

    const openEditItemModal = (item: TemplateItem) => {
        setEditingItem(item);
        setItemName(item.name);
        setItemDescription(item.description || "");
        setItemQuantity(item.quantity || "");
        setItemSectionName(item.sectionName || "");
        setShowEditItemModal(true);
    };

    const openDeleteItemModal = (item: TemplateItem) => {
        setDeletingItem(item);
        setShowDeleteItemModal(true);
    };

    const handleEditItem = async () => {
        if (!template || !editingItem || !itemName.trim()) return;

        setIsSubmitting(true);
        try {
            const res = await templatesApi.updateItem(template.id, editingItem.id, {
                name: itemName.trim(),
                description: itemDescription.trim() || null,
                quantity: itemQuantity.trim() || null,
                sectionName: itemSectionName.trim() || null,
            });
            if (res.success && res.data) {
                setTemplate((prev) =>
                    prev
                        ? {
                              ...prev,
                              items: prev.items.map((i) =>
                                  i.id === editingItem.id ? res.data! : i
                              ),
                          }
                        : null
                );
                setShowEditItemModal(false);
                setEditingItem(null);
                showToast("Item updated");
            } else {
                showToast(res.error || "Failed to update item", "error");
            }
        } catch {
            showToast("Failed to update item", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteItem = async () => {
        if (!template || !deletingItem) return;

        setIsSubmitting(true);
        try {
            const res = await templatesApi.deleteItem(template.id, deletingItem.id);
            if (res.success) {
                setTemplate((prev) =>
                    prev
                        ? { ...prev, items: prev.items.filter((i) => i.id !== deletingItem.id) }
                        : null
                );
                setShowDeleteItemModal(false);
                setDeletingItem(null);
                showToast("Item deleted");
            } else {
                showToast(res.error || "Failed to delete item", "error");
            }
        } catch {
            showToast("Failed to delete item", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleItemDragStart = (itemId: number) => {
        setDragState({ itemId });
    };

    const handleItemDragOver = (e: React.DragEvent, targetItemId: number) => {
        e.preventDefault();
        if (!dragState || dragState.itemId === targetItemId || !template) return;

        const items = template.items;
        const draggedIndex = items.findIndex((i) => i.id === dragState.itemId);
        const targetIndex = items.findIndex((i) => i.id === targetItemId);

        if (draggedIndex === -1 || targetIndex === -1) return;

        const newItems = [...items];
        const [draggedItem] = newItems.splice(draggedIndex, 1);
        newItems.splice(targetIndex, 0, draggedItem);

        setTemplate((prev) => (prev ? { ...prev, items: newItems } : null));
    };

    const handleItemDragEnd = async () => {
        if (dragState && template) {
            const ids = template.items.map((i) => i.id);
            try {
                await templatesApi.reorderItems(template.id, ids);
            } catch {
                showToast("Failed to save order", "error");
            }
        }
        setDragState(null);
    };

    if (isLoading) {
        return <div className="loading">Loading template...</div>;
    }

    if (!template) {
        return <div className="loading">Template not found</div>;
    }

    return (
        <div className="template-detail-page">
            <div className="template-detail-header">
                <button className="back-btn" onClick={() => navigate("/templates")}>
                    ← Back
                </button>
                <h1>{template.name}</h1>
                <button className="edit-name-btn" onClick={openEditNameModal}>
                    Edit Name
                </button>
            </div>

            <div className="add-item-form">
                <input
                    type="text"
                    placeholder="Add item..."
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            handleAddItem();
                        }
                    }}
                />
                <button className="add-item-btn" onClick={handleAddItem}>
                    Add
                </button>
            </div>

            {template.items.length === 0 ? (
                <div className="items-empty">No items in this template</div>
            ) : (
                <div className="items-list">
                    {template.items.map((item) => (
                        <div
                            key={item.id}
                            className={`template-item-row ${dragState?.itemId === item.id ? "dragging" : ""}`}
                            draggable
                            onDragStart={() => handleItemDragStart(item.id)}
                            onDragOver={(e) => handleItemDragOver(e, item.id)}
                            onDragEnd={handleItemDragEnd}
                        >
                            <span className="item-drag-handle">⋮</span>
                            <span className="item-name">
                                {item.name}
                                {item.quantity && <span className="item-quantity"> ({item.quantity})</span>}
                            </span>
                            {item.sectionName && (
                                <span className="item-section">{item.sectionName}</span>
                            )}
                            <div className="item-actions" onClick={(e) => e.stopPropagation()}>
                                <button
                                    className="item-edit-btn"
                                    onClick={() => openEditItemModal(item)}
                                    title="Edit"
                                >
                                    ✎
                                </button>
                                <button
                                    className="item-delete-btn"
                                    onClick={() => openDeleteItemModal(item)}
                                    title="Delete"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showEditNameModal && (
                <div className="modal-overlay" onClick={() => setShowEditNameModal(false)}>
                    <div
                        ref={editNameModalRef}
                        className="modal"
                        tabIndex={-1}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && templateName.trim() && !isSubmitting) {
                                handleUpdateName();
                            }
                            if (e.key === "Escape") {
                                setShowEditNameModal(false);
                            }
                        }}
                    >
                        <h2>Edit Template Name</h2>
                        <div className="modal-form">
                            <div className="form-group">
                                <label htmlFor="template-name">Name</label>
                                <input
                                    id="template-name"
                                    type="text"
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    placeholder="Template name"
                                    maxLength={100}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowEditNameModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="submit-btn"
                                onClick={handleUpdateName}
                                disabled={!templateName.trim() || isSubmitting}
                            >
                                {isSubmitting ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showEditItemModal && editingItem && (
                <div className="modal-overlay" onClick={() => setShowEditItemModal(false)}>
                    <div
                        ref={editItemModalRef}
                        className="modal"
                        tabIndex={-1}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && itemName.trim() && !isSubmitting) {
                                handleEditItem();
                            }
                            if (e.key === "Escape") {
                                setShowEditItemModal(false);
                            }
                        }}
                    >
                        <h2>Edit Item</h2>
                        <div className="modal-form">
                            <div className="form-group">
                                <label htmlFor="item-name">Name</label>
                                <input
                                    id="item-name"
                                    type="text"
                                    value={itemName}
                                    onChange={(e) => setItemName(e.target.value)}
                                    placeholder="Item name"
                                    maxLength={200}
                                    autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="item-description">Description (optional)</label>
                                <input
                                    id="item-description"
                                    type="text"
                                    value={itemDescription}
                                    onChange={(e) => setItemDescription(e.target.value)}
                                    placeholder="Description"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="item-quantity">Quantity (optional)</label>
                                <input
                                    id="item-quantity"
                                    type="text"
                                    value={itemQuantity}
                                    onChange={(e) => setItemQuantity(e.target.value)}
                                    placeholder="e.g., 2 lbs, 3 items"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="item-section">Section (optional)</label>
                                <input
                                    id="item-section"
                                    type="text"
                                    value={itemSectionName}
                                    onChange={(e) => setItemSectionName(e.target.value)}
                                    placeholder="e.g., Dairy, Produce"
                                />
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowEditItemModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="submit-btn"
                                onClick={handleEditItem}
                                disabled={!itemName.trim() || isSubmitting}
                            >
                                {isSubmitting ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteItemModal && deletingItem && (
                <div className="modal-overlay" onClick={() => setShowDeleteItemModal(false)}>
                    <div
                        ref={deleteItemModalRef}
                        className="modal delete-confirm"
                        tabIndex={-1}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !isSubmitting) {
                                handleDeleteItem();
                            }
                            if (e.key === "Escape") {
                                setShowDeleteItemModal(false);
                            }
                        }}
                    >
                        <h2>Delete Item?</h2>
                        <p>Are you sure you want to delete "{deletingItem.name}"?</p>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowDeleteItemModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="submit-btn danger-btn"
                                onClick={handleDeleteItem}
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
