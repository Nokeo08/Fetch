import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { listsApi, type ListWithCounts } from "./api/lists";
import { sectionsApi, itemsApi, type SectionWithItems, type Item, type HistoryEntry } from "./api/sections";
import { templatesApi, type TemplateWithItems } from "./api/templates";
import { useRealtimeUpdates } from "./useRealtimeUpdates";
import ConnectionStatus from "./ConnectionStatus";
import { Autocomplete } from "./Autocomplete";
import "./ListDetail.css";

type Toast = {
    message: string;
    type: "success" | "error";
};

type DragState = {
    sectionId: number;
    itemId: number | null;
};

export default function ListDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const listId = id ? parseInt(id, 10) : null;

    const [list, setList] = useState<ListWithCounts | null>(null);
    const [sections, setSections] = useState<SectionWithItems[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<Toast | null>(null);

    useRealtimeUpdates(setSections);

    const [showSectionModal, setShowSectionModal] = useState(false);
    const [showEditSectionModal, setShowEditSectionModal] = useState(false);
    const [showDeleteSectionModal, setShowDeleteSectionModal] = useState(false);
    const [editingSection, setEditingSection] = useState<SectionWithItems | null>(null);
    const [deletingSection, setDeletingSection] = useState<SectionWithItems | null>(null);

    const [sectionName, setSectionName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());
    const [expandedCompletedSections, setExpandedCompletedSections] = useState<Set<number>>(new Set());
    const [draggedSectionId, setDraggedSectionId] = useState<number | null>(null);

    const [quickAddName, setQuickAddName] = useState("");
    const [quickAddQuantity, setQuickAddQuantity] = useState("");
    const [quickAddDescription, setQuickAddDescription] = useState("");
    const [quickAddSectionId, setQuickAddSectionId] = useState<number | null>(null);
    const [dragState, setDragState] = useState<DragState | null>(null);

    const [showEditItemModal, setShowEditItemModal] = useState(false);
    const [showDeleteItemModal, setShowDeleteItemModal] = useState(false);
    const [editingItem, setEditingItem] = useState<{ item: Item; sectionId: number } | null>(null);
    const [deletingItem, setDeletingItem] = useState<{ item: Item; sectionId: number } | null>(null);
    const [itemName, setItemName] = useState("");
    const [itemDescription, setItemDescription] = useState("");
    const [itemQuantity, setItemQuantity] = useState("");
    const [itemSectionId, setItemSectionId] = useState<number | null>(null);

    const [showClearCompletedModal, setShowClearCompletedModal] = useState(false);
    const [clearingSection, setClearingSection] = useState<SectionWithItems | null>(null);

    const [showApplyTemplateModal, setShowApplyTemplateModal] = useState(false);
    const [showSaveAsTemplateModal, setShowSaveAsTemplateModal] = useState(false);
    const [availableTemplates, setAvailableTemplates] = useState<TemplateWithItems[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateWithItems | null>(null);
    const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
    const [templateName, setTemplateName] = useState("");

    const deleteSectionModalRef = useRef<HTMLDivElement>(null);
    const deleteItemModalRef = useRef<HTMLDivElement>(null);
    const clearCompletedModalRef = useRef<HTMLDivElement>(null);
    const editItemModalRef = useRef<HTMLDivElement>(null);
    const applyTemplateModalRef = useRef<HTMLDivElement>(null);
    const saveAsTemplateModalRef = useRef<HTMLDivElement>(null);

    const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    useEffect(() => {
        if (showDeleteSectionModal && deleteSectionModalRef.current) {
            deleteSectionModalRef.current.focus();
        }
    }, [showDeleteSectionModal]);

    useEffect(() => {
        if (showDeleteItemModal && deleteItemModalRef.current) {
            deleteItemModalRef.current.focus();
        }
    }, [showDeleteItemModal]);

    useEffect(() => {
        if (showClearCompletedModal && clearCompletedModalRef.current) {
            clearCompletedModalRef.current.focus();
        }
    }, [showClearCompletedModal]);

    useEffect(() => {
        if (showEditItemModal && editItemModalRef.current) {
            editItemModalRef.current.focus();
        }
    }, [showEditItemModal]);

    useEffect(() => {
        if (showApplyTemplateModal && applyTemplateModalRef.current) {
            applyTemplateModalRef.current.focus();
        }
    }, [showApplyTemplateModal]);

    useEffect(() => {
        if (showSaveAsTemplateModal && saveAsTemplateModalRef.current) {
            saveAsTemplateModalRef.current.focus();
        }
    }, [showSaveAsTemplateModal]);

    useEffect(() => {
        if (sections.length > 0 && (quickAddSectionId === null || !sections.some((s) => s.id === quickAddSectionId))) {
            setQuickAddSectionId(sections[0]?.id ?? null);
        }
    }, [sections, quickAddSectionId]);

    const fetchData = useCallback(async () => {
        if (!listId) return;

        try {
            const [listRes, sectionsRes] = await Promise.all([
                listsApi.getById(listId),
                sectionsApi.getByListId(listId),
            ]);

            if (listRes.success && listRes.data) {
                setList(listRes.data as ListWithCounts);
            } else {
                showToast("List not found", "error");
                navigate("/");
                return;
            }

            if (sectionsRes.success && sectionsRes.data) {
                setSections(sectionsRes.data);
            }
        } catch {
            showToast("Failed to load list", "error");
        } finally {
            setIsLoading(false);
        }
    }, [listId, navigate, showToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const openSectionModal = () => {
        setSectionName("");
        setShowSectionModal(true);
    };

    const openEditSectionModal = (section: SectionWithItems) => {
        setEditingSection(section);
        setSectionName(section.name);
        setShowEditSectionModal(true);
    };

    const openDeleteSectionModal = (section: SectionWithItems) => {
        setDeletingSection(section);
        setShowDeleteSectionModal(true);
    };

    const handleCreateSection = async () => {
        if (!listId || !sectionName.trim()) return;

        setIsSubmitting(true);
        try {
            const res = await sectionsApi.create(listId, sectionName.trim());
            if (res.success && res.data) {
                // Don't do optimistic update - rely on WebSocket for consistency
                setShowSectionModal(false);
                showToast("Section added");
            } else {
                showToast(res.error || "Failed to create section", "error");
            }
        } catch {
            showToast("Failed to create section", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditSection = async () => {
        if (!editingSection || !sectionName.trim()) return;

        setIsSubmitting(true);
        try {
            const res = await sectionsApi.update(editingSection.id, sectionName.trim());
            if (res.success && res.data) {
                setSections((prev) =>
                    prev.map((s) =>
                        s.id === editingSection.id ? { ...s, name: res.data!.name } : s
                    )
                );
                setShowEditSectionModal(false);
                setEditingSection(null);
                showToast("Section updated");
            } else {
                showToast(res.error || "Failed to update section", "error");
            }
        } catch {
            showToast("Failed to update section", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteSection = async () => {
        if (!deletingSection) return;

        setIsSubmitting(true);
        try {
            const res = await sectionsApi.delete(deletingSection.id);
            if (res.success) {
                setSections((prev) => prev.filter((s) => s.id !== deletingSection.id));
                setShowDeleteSectionModal(false);
                setDeletingSection(null);
                showToast("Section deleted");
            } else {
                showToast(res.error || "Failed to delete section", "error");
            }
        } catch {
            showToast("Failed to delete section", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleCollapse = (sectionId: number) => {
        setCollapsedSections((prev) => {
            const next = new Set(prev);
            if (next.has(sectionId)) {
                next.delete(sectionId);
            } else {
                next.add(sectionId);
            }
            return next;
        });
    };

    const toggleCompletedCollapse = (sectionId: number) => {
        setExpandedCompletedSections((prev) => {
            const next = new Set(prev);
            if (next.has(sectionId)) {
                next.delete(sectionId);
            } else {
                next.add(sectionId);
            }
            return next;
        });
    };

    const handleSectionDragStart = (sectionId: number) => {
        setDraggedSectionId(sectionId);
    };

    const handleSectionDragOver = (e: React.DragEvent, targetId: number) => {
        e.preventDefault();
        if (draggedSectionId === null || draggedSectionId === targetId) return;

        const draggedIndex = sections.findIndex((s) => s.id === draggedSectionId);
        const targetIndex = sections.findIndex((s) => s.id === targetId);

        if (draggedIndex === -1 || targetIndex === -1) return;

        const newSections = [...sections];
        const [draggedItem] = newSections.splice(draggedIndex, 1);
        newSections.splice(targetIndex, 0, draggedItem);
        setSections(newSections);
    };

    const handleSectionDragEnd = async () => {
        if (draggedSectionId !== null) {
            const ids = sections.map((s) => s.id);
            try {
                await sectionsApi.reorder(ids);
            } catch {
                showToast("Failed to save order", "error");
            }
        }
        setDraggedSectionId(null);
    };

    const handleQuickAdd = async () => {
        const name = quickAddName.trim();
        const sectionId = quickAddSectionId;
        if (!name || !sectionId) return;

        const quantity = quickAddQuantity.trim() || undefined;
        const description = quickAddDescription.trim() || undefined;

        try {
            const res = await itemsApi.create(sectionId, name, description, quantity);
            if (res.success && res.data) {
                setQuickAddName("");
                setQuickAddQuantity("");
                setQuickAddDescription("");
            } else {
                showToast(res.error || "Failed to add item", "error");
            }
        } catch {
            showToast("Failed to add item", "error");
        }
    };

    const handleDeleteItem = async (itemId: number, sectionId: number) => {
        try {
            const res = await itemsApi.delete(itemId);
            if (res.success) {
                setSections((prev) =>
                    prev.map((s) =>
                        s.id === sectionId
                            ? { ...s, items: s.items.filter((i) => i.id !== itemId) }
                            : s
                    )
                );
                showToast("Item deleted");
            }
        } catch {
            showToast("Failed to delete item", "error");
        }
    };

    const openEditItemModal = (item: Item, sectionId: number) => {
        setEditingItem({ item, sectionId });
        setItemName(item.name);
        setItemDescription(item.description || "");
        setItemQuantity(item.quantity || "");
        setItemSectionId(item.sectionId);
        setShowEditItemModal(true);
    };

    const openAddItemModal = (sectionId: number) => {
        setEditingItem(null);
        setItemName("");
        setItemDescription("");
        setItemQuantity("");
        setItemSectionId(sectionId);
        setShowEditItemModal(true);
    };

    const openDeleteItemModal = (item: Item, sectionId: number) => {
        setDeletingItem({ item, sectionId });
        setShowDeleteItemModal(true);
    };

    const handleSaveItem = async () => {
        if (!itemName.trim() || !itemSectionId) return;

        setIsSubmitting(true);
        try {
            if (editingItem) {
                const needsMove = itemSectionId !== editingItem.item.sectionId;

                if (needsMove) {
                    const moveRes = await itemsApi.move(editingItem.item.id, itemSectionId);
                    if (!moveRes.success) {
                        showToast(moveRes.error || "Failed to move item", "error");
                        return;
                    }
                }

                const res = await itemsApi.update(editingItem.item.id, {
                    name: itemName.trim(),
                    description: itemDescription.trim() || null,
                    quantity: itemQuantity.trim() || null,
                });
                if (res.success && res.data) {
                    setSections((prev) => {
                        const updated = prev.map((s) => {
                            if (needsMove) {
                                if (s.id === editingItem.sectionId) {
                                    return { ...s, items: s.items.filter((i) => i.id !== editingItem.item.id) };
                                }
                                if (s.id === itemSectionId) {
                                    return { ...s, items: [...s.items, { ...res.data!, sectionId: itemSectionId }] };
                                }
                            } else if (s.id === editingItem.sectionId) {
                                return {
                                    ...s,
                                    items: s.items.map((i) =>
                                        i.id === editingItem.item.id ? res.data! : i
                                    ),
                                };
                            }
                            return s;
                        });
                        return updated;
                    });
                    setShowEditItemModal(false);
                    setEditingItem(null);
                    showToast(needsMove ? "Item moved and updated" : "Item updated");
                } else {
                    showToast(res.error || "Failed to update item", "error");
                }
            } else {
                const res = await itemsApi.create(
                    itemSectionId,
                    itemName.trim(),
                    itemDescription.trim() || undefined,
                    itemQuantity.trim() || undefined,
                );
                if (res.success && res.data) {
                    setShowEditItemModal(false);
                    showToast("Item added");
                } else {
                    showToast(res.error || "Failed to add item", "error");
                }
            }
        } catch {
            showToast(editingItem ? "Failed to update item" : "Failed to add item", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmDeleteItem = async () => {
        if (!deletingItem) return;

        setIsSubmitting(true);
        try {
            await handleDeleteItem(deletingItem.item.id, deletingItem.sectionId);
            setShowDeleteItemModal(false);
            setDeletingItem(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleItemDragStart = (sectionId: number, itemId: number) => {
        setDragState({ sectionId, itemId });
    };

    const handleItemDragOver = (e: React.DragEvent, sectionId: number, targetItemId: number) => {
        e.preventDefault();
        if (!dragState || dragState.sectionId !== sectionId || dragState.itemId === targetItemId) return;

        const sectionIndex = sections.findIndex((s) => s.id === sectionId);
        if (sectionIndex === -1) return;

        const section = sections[sectionIndex];
        const items = section.items;
        const draggedIndex = items.findIndex((i) => i.id === dragState.itemId);
        const targetIndex = items.findIndex((i) => i.id === targetItemId);

        if (draggedIndex === -1 || targetIndex === -1) return;

        const newItems = [...items];
        const [draggedItem] = newItems.splice(draggedIndex, 1);
        newItems.splice(targetIndex, 0, draggedItem);

        const newSections = [...sections];
        newSections[sectionIndex] = { ...section, items: newItems };
        setSections(newSections);
    };

    const handleItemDragEnd = async () => {
        if (dragState) {
            const section = sections.find((s) => s.id === dragState.sectionId);
            if (section) {
                const ids = section.items.map((i) => i.id);
                try {
                    await itemsApi.reorder(ids);
                } catch {
                    showToast("Failed to save order", "error");
                }
            }
        }
        setDragState(null);
    };

    const handleToggleCompleted = async (item: Item, sectionId: number) => {
        const newStatus: Item["status"] = item.status === "completed" ? "active" : "completed";

        try {
            const res = await itemsApi.update(item.id, { status: newStatus });
            if (res.success) {
                setSections((prev) =>
                    prev.map((s) => {
                        if (s.id !== sectionId) return s;
                        const updatedItems = s.items.map((i) =>
                            i.id === item.id ? { ...i, status: newStatus } : i
                        );
                        const sortedItems = sortItemsByStatus(updatedItems);
                        return { ...s, items: sortedItems };
                    })
                );
            }
        } catch {
            showToast("Failed to update item", "error");
        }
    };

    const handleToggleUncertain = async (item: Item, sectionId: number) => {
        const newStatus: Item["status"] = item.status === "uncertain" ? "active" : "uncertain";

        try {
            const res = await itemsApi.update(item.id, { status: newStatus });
            if (res.success) {
                setSections((prev) =>
                    prev.map((s) => {
                        if (s.id !== sectionId) return s;
                        return {
                            ...s,
                            items: s.items.map((i) =>
                                i.id === item.id ? { ...i, status: newStatus } : i
                            ),
                        };
                    })
                );
            }
        } catch {
            showToast("Failed to update item", "error");
        }
    };

    const sortItemsByStatus = (items: Item[]): Item[] => {
        return [...items].sort((a, b) => {
            const aCompleted = a.status === "completed" ? 1 : 0;
            const bCompleted = b.status === "completed" ? 1 : 0;
            if (aCompleted !== bCompleted) return aCompleted - bCompleted;
            return a.sortOrder - b.sortOrder;
        });
    };

    const openClearCompletedModal = (section: SectionWithItems) => {
        setClearingSection(section);
        setShowClearCompletedModal(true);
    };

    const handleClearCompleted = async () => {
        if (!clearingSection) return;

        setIsSubmitting(true);
        try {
            const completedItems = clearingSection.items.filter((i) => i.status === "completed");
            const count = completedItems.length;

            for (const item of completedItems) {
                await itemsApi.delete(item.id);
            }

            setSections((prev) =>
                prev.map((s) =>
                    s.id === clearingSection.id
                        ? { ...s, items: s.items.filter((i) => i.status !== "completed") }
                        : s
                )
            );
            setShowClearCompletedModal(false);
            setClearingSection(null);
            showToast(`Cleared ${count} completed item${count !== 1 ? "s" : ""}`);
        } catch {
            showToast("Failed to clear completed items", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const openApplyTemplateModal = async () => {
        try {
            const res = await templatesApi.getAll();
            if (res.success && res.data) {
                setAvailableTemplates(res.data);
                setSelectedTemplate(null);
                setSelectedItemIds(new Set());
                setShowApplyTemplateModal(true);
            }
        } catch {
            showToast("Failed to load templates", "error");
        }
    };

    const handleSelectTemplate = (template: TemplateWithItems) => {
        setSelectedTemplate(template);
        setSelectedItemIds(new Set(template.items.map((i) => i.id)));
    };

    const handleToggleTemplateItem = (itemId: number) => {
        setSelectedItemIds((prev) => {
            const next = new Set(prev);
            if (next.has(itemId)) {
                next.delete(itemId);
            } else {
                next.add(itemId);
            }
            return next;
        });
    };

    const handleApplyTemplate = async () => {
        if (!selectedTemplate || !listId || selectedItemIds.size === 0) return;

        setIsSubmitting(true);
        try {
            const res = await templatesApi.applyToList(
                selectedTemplate.id,
                listId,
                Array.from(selectedItemIds)
            );
            if (res.success && res.data) {
                setShowApplyTemplateModal(false);
                setSelectedTemplate(null);
                fetchData();
                const { added, skipped } = res.data;
                if (skipped.length > 0) {
                    showToast(`Added ${added} items, skipped ${skipped.length} duplicates`);
                } else {
                    showToast(`Added ${added} items`);
                }
            } else {
                showToast(res.error || "Failed to apply template", "error");
            }
        } catch {
            showToast("Failed to apply template", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const openSaveAsTemplateModal = () => {
        setTemplateName(list ? `${list.name} Template` : "");
        setShowSaveAsTemplateModal(true);
    };

    const handleSaveAsTemplate = async () => {
        if (!listId || !templateName.trim()) return;

        setIsSubmitting(true);
        try {
            const res = await templatesApi.createFromList(listId, templateName.trim());
            if (res.success && res.data) {
                setShowSaveAsTemplateModal(false);
                showToast(`Template "${res.data.name}" created with ${res.data.items.length} items`);
            } else {
                showToast(res.error || "Failed to create template", "error");
            }
        } catch {
            showToast("Failed to create template", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <div className="loading">Loading...</div>;
    }

    if (!list) {
        return <div className="loading">List not found</div>;
    }

    return (
        <div className="list-detail-page">
            <ConnectionStatus />
            <div className="list-detail-header">
                <button className="back-btn" onClick={() => navigate("/")}>
                    ← Back
                </button>
                <div className="list-title">
                    <span className="list-title-icon">{list.icon}</span>
                    <h1>{list.name}</h1>
                </div>
                <div className="header-actions">
                    <button className="template-btn" onClick={openApplyTemplateModal}>
                        Apply Template
                    </button>
                    <button className="template-btn secondary" onClick={openSaveAsTemplateModal}>
                        Save as Template
                    </button>
                    <button className="add-section-btn" onClick={openSectionModal}>
                        + Add Section
                    </button>
                </div>
            </div>

            {sections.length > 0 && (
                <div className="quick-add-bar">
                    <Autocomplete
                        value={quickAddName}
                        onChange={setQuickAddName}
                        onSelect={(entry: HistoryEntry) => {
                            setQuickAddName(entry.name);
                            if (entry.quantity) {
                                setQuickAddQuantity(entry.quantity);
                            }
                            if (entry.description) {
                                setQuickAddDescription(entry.description);
                            }
                        }}
                        onSubmit={handleQuickAdd}
                        placeholder="Item name..."
                    />
                    <input
                        className="quick-add-quantity"
                        type="text"
                        value={quickAddQuantity}
                        onChange={(e) => setQuickAddQuantity(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleQuickAdd();
                        }}
                        placeholder="Qty"
                    />
                    <input
                        className="quick-add-description"
                        type="text"
                        value={quickAddDescription}
                        onChange={(e) => setQuickAddDescription(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleQuickAdd();
                        }}
                        placeholder="Description"
                    />
                    <select
                        className="quick-add-section"
                        value={quickAddSectionId || ""}
                        onChange={(e) => setQuickAddSectionId(parseInt(e.target.value, 10))}
                    >
                        {sections.map((section) => (
                            <option key={section.id} value={section.id}>
                                {section.name}
                            </option>
                        ))}
                    </select>
                    <button
                        className="quick-add-btn"
                        onClick={handleQuickAdd}
                        disabled={!quickAddName.trim() || !quickAddSectionId}
                    >
                        Add
                    </button>
                </div>
            )}

            {sections.length === 0 ? (
                <div className="sections-empty">
                    <p>No sections yet. Add a section to organize your items.</p>
                </div>
            ) : (
                <div className="sections-list">
                    {sections.map((section) => (
                        <div
                            key={section.id}
                            className={`section-card ${draggedSectionId === section.id ? "dragging" : ""}`}
                            draggable
                            onDragStart={() => handleSectionDragStart(section.id)}
                            onDragOver={(e) => handleSectionDragOver(e, section.id)}
                            onDragEnd={handleSectionDragEnd}
                        >
                            <div className="section-header">
                                <span className="section-drag-handle">⋮⋮</span>
                                <button
                                    className={`section-collapse-btn ${collapsedSections.has(section.id) ? "collapsed" : ""}`}
                                    onClick={() => toggleCollapse(section.id)}
                                >
                                    ▼
                                </button>
                                <span className="section-name">{section.name}</span>
                                <span className="section-item-count">{section.items.length}</span>
                                <div className="section-actions">
                                    {section.items.some((i) => i.status === "completed") && (
                                        <button
                                            className="section-clear-btn"
                                            onClick={() => openClearCompletedModal(section)}
                                        >
                                            Clear
                                        </button>
                                    )}
                                    <button
                                        className="section-add-btn"
                                        onClick={() => openAddItemModal(section.id)}
                                    >
                                        Add
                                    </button>
                                    <button
                                        className="section-edit-btn"
                                        onClick={() => openEditSectionModal(section)}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        className="section-delete-btn"
                                        onClick={() => openDeleteSectionModal(section)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>

                            <div className={`section-content ${collapsedSections.has(section.id) ? "collapsed" : ""}`}>
                                {section.items.length === 0 ? (
                                    <div className="items-empty">No items in this section</div>
                                ) : (
                                    (() => {
                                        const activeItems = section.items.filter((i) => i.status !== "completed");
                                        const completedItems = section.items.filter((i) => i.status === "completed");
                                        const isCompletedExpanded = expandedCompletedSections.has(section.id);

                                        return (
                                            <>
                                                {activeItems.length > 0 && (
                                                    <div className="items-list">
                                                        {activeItems.map((item) => (
                                                            <div
                                                                key={item.id}
                                                                className={`item-row ${item.status} ${dragState?.itemId === item.id ? "dragging" : ""}`}
                                                                draggable
                                                                onClick={() => handleToggleCompleted(item, section.id)}
                                                                onDragStart={() => handleItemDragStart(section.id, item.id)}
                                                                onDragOver={(e) => handleItemDragOver(e, section.id, item.id)}
                                                                onDragEnd={handleItemDragEnd}
                                                            >
                                                                <span
                                                                    className="item-drag-handle"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    ⋮
                                                                </span>
                                                                <div className="item-content">
                                                                    <div className="item-row-main">
                                                                        <input
                                                                            type="checkbox"
                                                                            className="item-checkbox"
                                                                            checked={item.status === "completed"}
                                                                            onChange={() => handleToggleCompleted(item, section.id)}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        />
                                                                        <span className="item-name">
                                                                            {item.name}
                                                                            {item.quantity && <span className="item-quantity-inline"> ({item.quantity})</span>}
                                                                        </span>
                                                                    </div>
                                                                    {item.description && (
                                                                        <span className="item-description">{item.description}</span>
                                                                    )}
                                                                </div>
                                                                <div className="item-actions" onClick={(e) => e.stopPropagation()}>
                                                                    {item.status !== "completed" && (
                                                                        <button
                                                                            className="item-uncertain-btn"
                                                                            onClick={() => handleToggleUncertain(item, section.id)}
                                                                            title={item.status === "uncertain" ? "Remove uncertain" : "Mark as uncertain"}
                                                                        >
                                                                            ?
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        className="item-edit-btn"
                                                                        onClick={() => openEditItemModal(item, section.id)}
                                                                        title="Edit"
                                                                    >
                                                                        ✎
                                                                    </button>
                                                                    <button
                                                                        className="item-delete-btn"
                                                                        onClick={() => openDeleteItemModal(item, section.id)}
                                                                        title="Delete"
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {completedItems.length > 0 && (
                                                    <div className="completed-section">
                                                        <button
                                                            className="completed-section-header"
                                                            onClick={() => toggleCompletedCollapse(section.id)}
                                                        >
                                                            <span className={`completed-collapse-btn ${isCompletedExpanded ? "" : "collapsed"}`}>▼</span>
                                                            <span>Completed ({completedItems.length})</span>
                                                        </button>
                                                        {isCompletedExpanded && (
                                                            <div className="completed-items-list">
                                                                {completedItems.map((item) => (
                                                                    <div
                                                                        key={item.id}
                                                                        className={`item-row completed ${dragState?.itemId === item.id ? "dragging" : ""}`}
                                                                        draggable
                                                                        onClick={() => handleToggleCompleted(item, section.id)}
                                                                        onDragStart={() => handleItemDragStart(section.id, item.id)}
                                                                        onDragOver={(e) => handleItemDragOver(e, section.id, item.id)}
                                                                        onDragEnd={handleItemDragEnd}
                                                                    >
                                                                        <span
                                                                            className="item-drag-handle"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        >
                                                                            ⋮
                                                                        </span>
                                                                        <div className="item-content">
                                                                            <div className="item-row-main">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    className="item-checkbox"
                                                                                    checked={true}
                                                                                    onChange={() => handleToggleCompleted(item, section.id)}
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                />
                                                                                <span className="item-name completed">
                                                                                    {item.name}
                                                                                    {item.quantity && <span className="item-quantity-inline"> ({item.quantity})</span>}
                                                                                </span>
                                                                            </div>
                                                                            {item.description && (
                                                                                <span className="item-description">{item.description}</span>
                                                                            )}
                                                                        </div>
                                                                        <div className="item-actions" onClick={(e) => e.stopPropagation()}>
                                                                            <button
                                                                                className="item-edit-btn"
                                                                                onClick={() => openEditItemModal(item, section.id)}
                                                                                title="Edit"
                                                                            >
                                                                                ✎
                                                                            </button>
                                                                            <button
                                                                                className="item-delete-btn"
                                                                                onClick={() => openDeleteItemModal(item, section.id)}
                                                                                title="Delete"
                                                                            >
                                                                                ✕
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showSectionModal && (
                <div className="modal-overlay" onClick={() => setShowSectionModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Add Section</h2>
                        <div className="modal-form">
                            <div className="form-group">
                                <label htmlFor="section-name">Name</label>
                                <input
                                    id="section-name"
                                    type="text"
                                    value={sectionName}
                                    onChange={(e) => setSectionName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && sectionName.trim() && !isSubmitting) {
                                            handleCreateSection();
                                        }
                                    }}
                                    placeholder="Enter section name"
                                    maxLength={100}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowSectionModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="submit-btn"
                                onClick={handleCreateSection}
                                disabled={!sectionName.trim() || isSubmitting}
                            >
                                {isSubmitting ? "Adding..." : "Add"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showEditSectionModal && editingSection && (
                <div className="modal-overlay" onClick={() => setShowEditSectionModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Edit Section</h2>
                        <div className="modal-form">
                            <div className="form-group">
                                <label htmlFor="edit-section-name">Name</label>
                                <input
                                    id="edit-section-name"
                                    type="text"
                                    value={sectionName}
                                    onChange={(e) => setSectionName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && sectionName.trim() && !isSubmitting) {
                                            handleEditSection();
                                        }
                                    }}
                                    placeholder="Enter section name"
                                    maxLength={100}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowEditSectionModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="submit-btn"
                                onClick={handleEditSection}
                                disabled={!sectionName.trim() || isSubmitting}
                            >
                                {isSubmitting ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteSectionModal && deletingSection && (
                <div className="modal-overlay" onClick={() => setShowDeleteSectionModal(false)}>
                    <div
                        ref={deleteSectionModalRef}
                        className="modal delete-confirm"
                        tabIndex={-1}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !isSubmitting) {
                                handleDeleteSection();
                            }
                            if (e.key === "Escape") {
                                setShowDeleteSectionModal(false);
                            }
                        }}
                    >
                        <h2>Delete Section?</h2>
                        <p>Are you sure you want to delete "{deletingSection.name}"?</p>
                        {deletingSection.items.length > 0 && (
                            <p className="warning">
                                This will also delete {deletingSection.items.length} item(s) in this section.
                            </p>
                        )}
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowDeleteSectionModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="submit-btn danger-btn"
                                onClick={handleDeleteSection}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showEditItemModal && (
                <div className="modal-overlay" onClick={() => setShowEditItemModal(false)}>
                    <div
                        ref={editItemModalRef}
                        className="modal"
                        tabIndex={-1}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && itemName.trim() && !isSubmitting) {
                                handleSaveItem();
                            }
                            if (e.key === "Escape") {
                                setShowEditItemModal(false);
                            }
                        }}
                    >
                        <h2>{editingItem ? "Edit Item" : "Add Item"}</h2>
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
                                <label htmlFor="item-section">Section</label>
                                <select
                                    id="item-section"
                                    value={itemSectionId || ""}
                                    onChange={(e) => setItemSectionId(parseInt(e.target.value, 10))}
                                >
                                    {sections.map((section) => (
                                        <option key={section.id} value={section.id}>
                                            {section.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowEditItemModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="submit-btn"
                                onClick={handleSaveItem}
                                disabled={!itemName.trim() || isSubmitting}
                            >
                                {isSubmitting ? "Saving..." : editingItem ? "Save" : "Add"}
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
                                handleConfirmDeleteItem();
                            }
                            if (e.key === "Escape") {
                                setShowDeleteItemModal(false);
                            }
                        }}
                    >
                        <h2>Delete Item?</h2>
                        <p>Are you sure you want to delete "{deletingItem.item.name}"?</p>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowDeleteItemModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="submit-btn danger-btn"
                                onClick={handleConfirmDeleteItem}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showClearCompletedModal && clearingSection && (
                <div className="modal-overlay" onClick={() => setShowClearCompletedModal(false)}>
                    <div
                        ref={clearCompletedModalRef}
                        className="modal delete-confirm"
                        tabIndex={-1}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !isSubmitting) {
                                handleClearCompleted();
                            }
                            if (e.key === "Escape") {
                                setShowClearCompletedModal(false);
                            }
                        }}
                    >
                        <h2>Clear Completed Items?</h2>
                        <p>
                            Remove {clearingSection.items.filter((i) => i.status === "completed").length} completed item(s)
                            from "{clearingSection.name}"?
                        </p>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowClearCompletedModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="submit-btn danger-btn"
                                onClick={handleClearCompleted}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Clearing..." : "Clear"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showApplyTemplateModal && (
                <div className="modal-overlay" onClick={() => setShowApplyTemplateModal(false)}>
                    <div
                        ref={applyTemplateModalRef}
                        className="modal apply-template-modal"
                        tabIndex={-1}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") {
                                setShowApplyTemplateModal(false);
                            }
                        }}
                    >
                        <h2>Apply Template</h2>
                        {!selectedTemplate ? (
                            <>
                                {availableTemplates.length === 0 ? (
                                    <p className="no-templates">No templates available. Create a template first.</p>
                                ) : (
                                    <div className="template-list">
                                        {availableTemplates.map((template) => (
                                            <button
                                                key={template.id}
                                                className="template-option"
                                                onClick={() => handleSelectTemplate(template)}
                                            >
                                                <span className="template-option-name">{template.name}</span>
                                                <span className="template-option-count">{template.items.length} items</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <p className="selected-template-name">
                                    Template: <strong>{selectedTemplate.name}</strong>
                                </p>
                                <p className="select-items-hint">Select items to add:</p>
                                <div className="template-items-list">
                                    {selectedTemplate.items.map((item) => (
                                        <label key={item.id} className="template-item-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={selectedItemIds.has(item.id)}
                                                onChange={() => handleToggleTemplateItem(item.id)}
                                            />
                                            <span className="template-item-name">{item.name}</span>
                                            {item.sectionName && (
                                                <span className="template-item-section">{item.sectionName}</span>
                                            )}
                                        </label>
                                    ))}
                                </div>
                                <div className="modal-actions">
                                    <button className="cancel-btn" onClick={() => setSelectedTemplate(null)}>
                                        Back
                                    </button>
                                    <button
                                        className="submit-btn"
                                        onClick={handleApplyTemplate}
                                        disabled={selectedItemIds.size === 0 || isSubmitting}
                                    >
                                        {isSubmitting ? "Adding..." : `Add ${selectedItemIds.size} Items`}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {showSaveAsTemplateModal && (
                <div className="modal-overlay" onClick={() => setShowSaveAsTemplateModal(false)}>
                    <div
                        ref={saveAsTemplateModalRef}
                        className="modal"
                        tabIndex={-1}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && templateName.trim() && !isSubmitting) {
                                handleSaveAsTemplate();
                            }
                            if (e.key === "Escape") {
                                setShowSaveAsTemplateModal(false);
                            }
                        }}
                    >
                        <h2>Save as Template</h2>
                        <p className="modal-description">
                            Create a template from this list with {sections.reduce((acc, s) => acc + s.items.length, 0)} items.
                        </p>
                        <div className="modal-form">
                            <div className="form-group">
                                <label htmlFor="template-name">Template Name</label>
                                <input
                                    id="template-name"
                                    type="text"
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    placeholder="e.g., Weekly Groceries"
                                    maxLength={100}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowSaveAsTemplateModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="submit-btn"
                                onClick={handleSaveAsTemplate}
                                disabled={!templateName.trim() || isSubmitting}
                            >
                                {isSubmitting ? "Saving..." : "Save Template"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
        </div>
    );
}
