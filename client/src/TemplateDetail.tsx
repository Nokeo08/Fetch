import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { TemplateItem } from "shared/dist";
import { templatesApi, type TemplateWithItems } from "./api/templates";
import { useTranslation } from "./i18n/index";
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
    const { t } = useTranslation();
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
                showToast(res.error || t("templateDetail.failedToLoad"), "error");
            }
        } catch {
            showToast(t("templateDetail.failedToLoad"), "error");
        } finally {
            setIsLoading(false);
        }
    }, [templateId, showToast, t]);

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
                showToast(t("templateDetail.nameUpdated"));
            } else {
                showToast(res.error || t("templateDetail.failedToUpdateName"), "error");
            }
        } catch {
            showToast(t("templateDetail.failedToUpdateName"), "error");
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
                showToast(t("templateDetail.itemAdded"));
            } else {
                showToast(res.error || t("templateDetail.failedToAddItem"), "error");
            }
        } catch {
            showToast(t("templateDetail.failedToAddItem"), "error");
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
                showToast(t("templateDetail.itemUpdated"));
            } else {
                showToast(res.error || t("templateDetail.failedToUpdateItem"), "error");
            }
        } catch {
            showToast(t("templateDetail.failedToUpdateItem"), "error");
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
                showToast(t("templateDetail.itemDeleted"));
            } else {
                showToast(res.error || t("templateDetail.failedToDeleteItem"), "error");
            }
        } catch {
            showToast(t("templateDetail.failedToDeleteItem"), "error");
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
                showToast(t("common.failedToSaveOrder"), "error");
            }
        }
        setDragState(null);
    };

    if (isLoading) {
        return <div className="loading">{t("templateDetail.loadingTemplate")}</div>;
    }

    if (!template) {
        return <div className="loading">{t("templateDetail.templateNotFound")}</div>;
    }

    return (
        <div className="template-detail-page">
            <div className="template-detail-header">
                <button className="back-btn" onClick={() => navigate("/templates")}>
                    <span className="back-arrow">←</span>
                    <span className="back-text">{t("common.back")}</span>
                </button>
                <h1>{template.name}</h1>
                <button className="edit-name-btn" onClick={openEditNameModal}>
                    {t("templateDetail.editName")}
                </button>
            </div>

            <div className="add-item-form">
                <input
                    type="text"
                    placeholder={t("templateDetail.addItemPlaceholder")}
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            handleAddItem();
                        }
                    }}
                />
                <button className="add-item-btn" onClick={handleAddItem}>
                    {t("common.add")}
                </button>
            </div>

            {template.items.length === 0 ? (
                <div className="items-empty">{t("templateDetail.itemsEmpty")}</div>
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
                                    title={t("common.edit")}
                                >
                                    ✎
                                </button>
                                <button
                                    className="item-delete-btn"
                                    onClick={() => openDeleteItemModal(item)}
                                    title={t("common.delete")}
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
                        <h2>{t("templateDetail.editTemplateName")}</h2>
                        <div className="modal-form">
                            <div className="form-group">
                                <label htmlFor="template-name">{t("common.name")}</label>
                                <input
                                    id="template-name"
                                    type="text"
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    placeholder={t("templateDetail.templateNamePlaceholder")}
                                    maxLength={100}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowEditNameModal(false)}>
                                {t("common.cancel")}
                            </button>
                            <button
                                className="submit-btn"
                                onClick={handleUpdateName}
                                disabled={!templateName.trim() || isSubmitting}
                            >
                                {isSubmitting ? t("common.saving") : t("common.save")}
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
                        <h2>{t("templateDetail.editItem")}</h2>
                        <div className="modal-form">
                            <div className="form-group">
                                <label htmlFor="item-name">{t("common.name")}</label>
                                <input
                                    id="item-name"
                                    type="text"
                                    value={itemName}
                                    onChange={(e) => setItemName(e.target.value)}
                                    placeholder={t("templateDetail.itemNamePlaceholder")}
                                    maxLength={200}
                                    autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="item-description">{t("templateDetail.descriptionLabel")}</label>
                                <input
                                    id="item-description"
                                    type="text"
                                    value={itemDescription}
                                    onChange={(e) => setItemDescription(e.target.value)}
                                    placeholder={t("templateDetail.descriptionPlaceholder")}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="item-quantity">{t("templateDetail.quantityLabel")}</label>
                                <input
                                    id="item-quantity"
                                    type="text"
                                    value={itemQuantity}
                                    onChange={(e) => setItemQuantity(e.target.value)}
                                    placeholder={t("templateDetail.quantityPlaceholder")}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="item-section">{t("templateDetail.sectionLabel")}</label>
                                <input
                                    id="item-section"
                                    type="text"
                                    value={itemSectionName}
                                    onChange={(e) => setItemSectionName(e.target.value)}
                                    placeholder={t("templateDetail.sectionPlaceholder")}
                                />
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowEditItemModal(false)}>
                                {t("common.cancel")}
                            </button>
                            <button
                                className="submit-btn"
                                onClick={handleEditItem}
                                disabled={!itemName.trim() || isSubmitting}
                            >
                                {isSubmitting ? t("common.saving") : t("common.save")}
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
                        <h2>{t("templateDetail.deleteItem")}</h2>
                        <p>{t("templateDetail.deleteConfirm", { name: deletingItem.name })}</p>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowDeleteItemModal(false)}>
                                {t("common.cancel")}
                            </button>
                            <button
                                className="submit-btn danger-btn"
                                onClick={handleDeleteItem}
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
