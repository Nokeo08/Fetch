import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { listsApi, type ListWithCounts } from "./api/lists";
import { sectionsApi, itemsApi, type SectionWithItems, type Item } from "./api/sections";
import "./ListDetail.css";

type Toast = {
    message: string;
    type: "success" | "error";
};

export default function ListDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const listId = id ? parseInt(id, 10) : null;

    const [list, setList] = useState<ListWithCounts | null>(null);
    const [sections, setSections] = useState<SectionWithItems[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<Toast | null>(null);

    const [showSectionModal, setShowSectionModal] = useState(false);
    const [showEditSectionModal, setShowEditSectionModal] = useState(false);
    const [showDeleteSectionModal, setShowDeleteSectionModal] = useState(false);
    const [editingSection, setEditingSection] = useState<SectionWithItems | null>(null);
    const [deletingSection, setDeletingSection] = useState<SectionWithItems | null>(null);

    const [sectionName, setSectionName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());
    const [draggedSectionId, setDraggedSectionId] = useState<number | null>(null);

    const [newItemNames, setNewItemNames] = useState<Record<number, string>>({});

    const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

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
                setSections((prev) => [...prev, { ...res.data!, items: [] }]);
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

    const handleAddItem = async (sectionId: number) => {
        const name = newItemNames[sectionId]?.trim();
        if (!name) return;

        try {
            const res = await itemsApi.create(sectionId, name);
            if (res.success && res.data) {
                setSections((prev) =>
                    prev.map((s) =>
                        s.id === sectionId
                            ? { ...s, items: [...s.items, res.data!] }
                            : s
                    )
                );
                setNewItemNames((prev) => ({ ...prev, [sectionId]: "" }));
            } else {
                showToast(res.error || "Failed to add item", "error");
            }
        } catch {
            showToast("Failed to add item", "error");
        }
    };

    const handleToggleItem = async (item: Item, sectionId: number) => {
        const newStatus = item.status === "completed" ? "active" : "completed";
        try {
            const res = await itemsApi.update(item.id, { status: newStatus });
            if (res.success) {
                setSections((prev) =>
                    prev.map((s) =>
                        s.id === sectionId
                            ? {
                                  ...s,
                                  items: s.items.map((i) =>
                                      i.id === item.id ? { ...i, status: newStatus } : i
                                  ),
                              }
                            : s
                    )
                );
            }
        } catch {
            showToast("Failed to update item", "error");
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
            }
        } catch {
            showToast("Failed to delete item", "error");
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
            <div className="list-detail-header">
                <button className="back-btn" onClick={() => navigate("/")}>
                    ← Back
                </button>
                <div className="list-title">
                    <span className="list-title-icon">{list.icon}</span>
                    <h1>{list.name}</h1>
                </div>
                <button className="add-section-btn" onClick={openSectionModal}>
                    + Add Section
                </button>
            </div>

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
                                <div className="add-item-form">
                                    <input
                                        type="text"
                                        placeholder="Add item..."
                                        value={newItemNames[section.id] || ""}
                                        onChange={(e) =>
                                            setNewItemNames((prev) => ({
                                                ...prev,
                                                [section.id]: e.target.value,
                                            }))
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                handleAddItem(section.id);
                                            }
                                        }}
                                    />
                                    <button
                                        className="add-item-btn"
                                        onClick={() => handleAddItem(section.id)}
                                    >
                                        Add
                                    </button>
                                </div>

                                {section.items.length === 0 ? (
                                    <div className="items-empty">No items in this section</div>
                                ) : (
                                    <div className="items-list">
                                        {section.items.map((item) => (
                                            <div
                                                key={item.id}
                                                className="item-row"
                                                onClick={() => handleToggleItem(item, section.id)}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="item-checkbox"
                                                    checked={item.status === "completed"}
                                                    onChange={() => handleToggleItem(item, section.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <span className={`item-name ${item.status === "completed" ? "completed" : ""}`}>
                                                    {item.name}
                                                </span>
                                                {item.quantity && (
                                                    <span className="item-quantity">{item.quantity}</span>
                                                )}
                                                <div className="item-actions" onClick={(e) => e.stopPropagation()}>
                                                    <button onClick={() => handleDeleteItem(item.id, section.id)}>
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
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
                    <div className="modal delete-confirm" onClick={(e) => e.stopPropagation()}>
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

            {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
        </div>
    );
}
