import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { importExportApi } from "./api/import-export";
import type { ExportData, ExportSummary, ExportOptions, ImportPreview, ImportMode } from "shared/dist";
import "./Settings.css";

type Toast = {
    message: string;
    type: "success" | "error";
};

type ImportStep = "idle" | "preview" | "options" | "importing" | "result";

type ImportResultData = {
    listsImported: number;
    listsMerged: number;
    templatesImported: number;
    historyImported: number;
    skipped: string[];
};

export default function Settings() {
    const navigate = useNavigate();
    const [toast, setToast] = useState<Toast | null>(null);

    const [showExportModal, setShowExportModal] = useState(false);
    const [exportSummary, setExportSummary] = useState<ExportSummary | null>(null);
    const [selectedListIds, setSelectedListIds] = useState<Set<number>>(new Set());
    const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<number>>(new Set());
    const [exportHistory, setExportHistory] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);
    const exportModalRef = useRef<HTMLDivElement>(null);

    const [importStep, setImportStep] = useState<ImportStep>("idle");
    const [importData, setImportData] = useState<ExportData | null>(null);
    const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
    const [importMode, setImportMode] = useState<ImportMode>("merge");
    const [importLists, setImportLists] = useState(true);
    const [importTemplates, setImportTemplates] = useState(true);
    const [importHistory, setImportHistory] = useState(true);
    const [importResult, setImportResult] = useState<ImportResultData | null>(null);
    const [importError, setImportError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const importModalRef = useRef<HTMLDivElement>(null);

    const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    useEffect(() => {
        if (importStep !== "idle" && importModalRef.current) {
            importModalRef.current.focus();
        }
    }, [importStep]);

    useEffect(() => {
        if (showExportModal && exportModalRef.current) {
            exportModalRef.current.focus();
        }
    }, [showExportModal]);

    const handleOpenExport = async () => {
        setIsLoadingSummary(true);
        try {
            const summary = await importExportApi.getExportSummary();
            setExportSummary(summary);
            setSelectedListIds(new Set(summary.lists.map((l) => l.id)));
            setSelectedTemplateIds(new Set(summary.templates.map((t) => t.id)));
            setExportHistory(true);
            setShowExportModal(true);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to load export data";
            showToast(message, "error");
        } finally {
            setIsLoadingSummary(false);
        }
    };

    const handleCloseExport = () => {
        setShowExportModal(false);
        setExportSummary(null);
        setSelectedListIds(new Set());
        setSelectedTemplateIds(new Set());
        setExportHistory(true);
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const options: ExportOptions = {
                listIds: [...selectedListIds],
                templateIds: [...selectedTemplateIds],
                includeHistory: exportHistory,
            };
            await importExportApi.exportData(options);
            showToast("Data exported successfully");
            handleCloseExport();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Export failed";
            showToast(message, "error");
        } finally {
            setIsExporting(false);
        }
    };

    const toggleListId = (id: number) => {
        setSelectedListIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleTemplateId = (id: number) => {
        setSelectedTemplateIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleAllLists = () => {
        if (!exportSummary) return;
        if (selectedListIds.size === exportSummary.lists.length) {
            setSelectedListIds(new Set());
        } else {
            setSelectedListIds(new Set(exportSummary.lists.map((l) => l.id)));
        }
    };

    const toggleAllTemplates = () => {
        if (!exportSummary) return;
        if (selectedTemplateIds.size === exportSummary.templates.length) {
            setSelectedTemplateIds(new Set());
        } else {
            setSelectedTemplateIds(new Set(exportSummary.templates.map((t) => t.id)));
        }
    };

    const exportHasSelection = selectedListIds.size > 0 || selectedTemplateIds.size > 0 || exportHistory;

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            showToast("File too large. Maximum size is 10 MB.", "error");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        if (!file.name.endsWith(".json")) {
            showToast("Only JSON files are supported", "error");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        try {
            const text = await file.text();
            let raw: unknown;
            try {
                raw = JSON.parse(text);
            } catch {
                showToast("Invalid JSON format", "error");
                if (fileInputRef.current) fileInputRef.current.value = "";
                return;
            }

            const obj = raw as Record<string, unknown>;
            if (!(obj.version && obj.exported_at && Array.isArray(obj.lists))) {
                showToast("Unrecognized file format", "error");
                if (fileInputRef.current) fileInputRef.current.value = "";
                return;
            }

            const parsed = obj as unknown as ExportData;

            setImportData(parsed);
            setImportError(null);

            const preview = await importExportApi.previewImport(parsed);
            setImportPreview(preview);
            setImportStep("preview");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to read file";
            showToast(message, "error");
        }

        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleProceedToOptions = () => {
        setImportStep("options");
    };

    const handleImport = async () => {
        if (!importData) return;

        setImportStep("importing");
        setImportError(null);

        try {
            const result = await importExportApi.importData(importData, {
                mode: importMode,
                importLists,
                importTemplates,
                importHistory,
            });
            setImportResult(result);
            setImportStep("result");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Import failed";
            setImportError(message);
            setImportStep("options");
        }
    };

    const handleCloseImport = () => {
        setImportStep("idle");
        setImportData(null);
        setImportPreview(null);
        setImportResult(null);
        setImportError(null);
        setImportMode("merge");
        setImportLists(true);
        setImportTemplates(true);
        setImportHistory(true);
    };

    return (
        <div className="settings-page">
            <div className="settings-header">
                <button className="back-btn" onClick={() => navigate("/")}>
                    Back
                </button>
                <h1>Settings</h1>
            </div>

            <div className="settings-section">
                <h2>Data Management</h2>

                <div className="settings-card">
                    <div className="settings-card-header">
                        <h3>Export</h3>
                        <p className="settings-card-description">
                            Download a JSON backup of your lists, templates, and history.
                        </p>
                    </div>
                    <button
                        className="settings-action-btn export-btn"
                        onClick={handleOpenExport}
                        disabled={isLoadingSummary}
                    >
                        {isLoadingSummary ? "Loading..." : "Export"}
                    </button>
                </div>

                <div className="settings-card">
                    <div className="settings-card-header">
                        <h3>Import Data</h3>
                        <p className="settings-card-description">
                            Import data from a previously exported JSON backup file.
                        </p>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleFileSelect}
                        style={{ display: "none" }}
                    />
                    <button
                        className="settings-action-btn import-btn"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        Import
                    </button>
                </div>
            </div>

            {showExportModal && exportSummary && (
                <div className="modal-overlay" onClick={handleCloseExport}>
                    <div
                        ref={exportModalRef}
                        className="modal export-modal"
                        tabIndex={-1}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") handleCloseExport();
                        }}
                    >
                        <h2>Export Data</h2>

                        {exportSummary.lists.length > 0 && (
                            <div className="export-group">
                                <div className="export-group-header">
                                    <label className="option-label">Lists</label>
                                    <button
                                        className="select-toggle-btn"
                                        onClick={toggleAllLists}
                                    >
                                        {selectedListIds.size === exportSummary.lists.length ? "Deselect All" : "Select All"}
                                    </button>
                                </div>
                                <div className="export-selection-list">
                                    {exportSummary.lists.map((list) => (
                                        <label key={list.id} className="checkbox-option">
                                            <input
                                                type="checkbox"
                                                checked={selectedListIds.has(list.id)}
                                                onChange={() => toggleListId(list.id)}
                                            />
                                            <span className="export-item-icon">{list.icon}</span>
                                            <span className="export-item-name">{list.name}</span>
                                            <span className="export-item-count">{list.itemCount} item{list.itemCount !== 1 ? "s" : ""}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {exportSummary.templates.length > 0 && (
                            <div className="export-group">
                                <div className="export-group-header">
                                    <label className="option-label">Templates</label>
                                    <button
                                        className="select-toggle-btn"
                                        onClick={toggleAllTemplates}
                                    >
                                        {selectedTemplateIds.size === exportSummary.templates.length ? "Deselect All" : "Select All"}
                                    </button>
                                </div>
                                <div className="export-selection-list">
                                    {exportSummary.templates.map((template) => (
                                        <label key={template.id} className="checkbox-option">
                                            <input
                                                type="checkbox"
                                                checked={selectedTemplateIds.has(template.id)}
                                                onChange={() => toggleTemplateId(template.id)}
                                            />
                                            <span className="export-item-name">{template.name}</span>
                                            <span className="export-item-count">{template.itemCount} item{template.itemCount !== 1 ? "s" : ""}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {exportSummary.historyCount > 0 && (
                            <div className="export-group">
                                <label className="checkbox-option">
                                    <input
                                        type="checkbox"
                                        checked={exportHistory}
                                        onChange={(e) => setExportHistory(e.target.checked)}
                                    />
                                    <span className="export-item-name">History</span>
                                    <span className="export-item-count">{exportSummary.historyCount} item{exportSummary.historyCount !== 1 ? "s" : ""}</span>
                                </label>
                            </div>
                        )}

                        {exportSummary.lists.length === 0 && exportSummary.templates.length === 0 && exportSummary.historyCount === 0 && (
                            <p className="export-empty">No data available to export.</p>
                        )}

                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={handleCloseExport}>
                                Cancel
                            </button>
                            <button
                                className="submit-btn"
                                onClick={handleExport}
                                disabled={isExporting || !exportHasSelection}
                            >
                                {isExporting ? "Exporting..." : "Export"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {importStep !== "idle" && (
                <div className="modal-overlay" onClick={handleCloseImport}>
                    <div
                        ref={importModalRef}
                        className="modal import-modal"
                        tabIndex={-1}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") handleCloseImport();
                        }}
                    >
                        {importStep === "preview" && importPreview && (
                            <>
                                <h2>Import Preview</h2>
                                <div className="import-preview-stats">
                                    <div className="preview-stat">
                                        <span className="stat-count">{importPreview.listCount}</span>
                                        <span className="stat-label">Lists</span>
                                    </div>
                                    <div className="preview-stat">
                                        <span className="stat-count">{importPreview.templateCount}</span>
                                        <span className="stat-label">Templates</span>
                                    </div>
                                    <div className="preview-stat">
                                        <span className="stat-count">{importPreview.historyCount}</span>
                                        <span className="stat-label">History Items</span>
                                    </div>
                                </div>

                                {(importPreview.existingListConflicts.length > 0 || importPreview.existingTemplateConflicts.length > 0) && (
                                    <div className="import-conflicts">
                                        <h3>Conflicts with Existing Data</h3>
                                        {importPreview.existingListConflicts.length > 0 && (
                                            <div className="conflict-group">
                                                <p className="conflict-label">Lists:</p>
                                                <ul>
                                                    {importPreview.existingListConflicts.map((name) => (
                                                        <li key={name}>{name}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {importPreview.existingTemplateConflicts.length > 0 && (
                                            <div className="conflict-group">
                                                <p className="conflict-label">Templates:</p>
                                                <ul>
                                                    {importPreview.existingTemplateConflicts.map((name) => (
                                                        <li key={name}>{name}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="modal-actions">
                                    <button className="cancel-btn" onClick={handleCloseImport}>
                                        Cancel
                                    </button>
                                    <button className="submit-btn" onClick={handleProceedToOptions}>
                                        Continue
                                    </button>
                                </div>
                            </>
                        )}

                        {importStep === "options" && (
                            <>
                                <h2>Import Options</h2>

                                {importError && (
                                    <div className="error-message">{importError}</div>
                                )}

                                <div className="import-options">
                                    <div className="option-group">
                                        <label className="option-label">Import Mode</label>
                                        <div className="import-mode-options">
                                            <label className="radio-option">
                                                <input
                                                    type="radio"
                                                    name="importMode"
                                                    value="merge"
                                                    checked={importMode === "merge"}
                                                    onChange={() => setImportMode("merge")}
                                                />
                                                <div>
                                                    <span className="radio-label">Merge</span>
                                                    <span className="radio-description">Add new data, merge into existing lists</span>
                                                </div>
                                            </label>
                                            <label className="radio-option">
                                                <input
                                                    type="radio"
                                                    name="importMode"
                                                    value="replace"
                                                    checked={importMode === "replace"}
                                                    onChange={() => setImportMode("replace")}
                                                />
                                                <div>
                                                    <span className="radio-label">Replace</span>
                                                    <span className="radio-description">Clear existing data first</span>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="option-group">
                                        <label className="option-label">What to Import</label>
                                        <div className="checkbox-options">
                                            <label className="checkbox-option">
                                                <input
                                                    type="checkbox"
                                                    checked={importLists}
                                                    onChange={(e) => setImportLists(e.target.checked)}
                                                />
                                                <span>Lists ({importPreview?.listCount ?? 0})</span>
                                            </label>
                                            <label className="checkbox-option">
                                                <input
                                                    type="checkbox"
                                                    checked={importTemplates}
                                                    onChange={(e) => setImportTemplates(e.target.checked)}
                                                />
                                                <span>Templates ({importPreview?.templateCount ?? 0})</span>
                                            </label>
                                            <label className="checkbox-option">
                                                <input
                                                    type="checkbox"
                                                    checked={importHistory}
                                                    onChange={(e) => setImportHistory(e.target.checked)}
                                                />
                                                <span>History ({importPreview?.historyCount ?? 0})</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-actions">
                                    <button className="cancel-btn" onClick={() => setImportStep("preview")}>
                                        Back
                                    </button>
                                    <button
                                        className="submit-btn"
                                        onClick={handleImport}
                                        disabled={!importLists && !importTemplates && !importHistory}
                                    >
                                        Import
                                    </button>
                                </div>
                            </>
                        )}

                        {importStep === "importing" && (
                            <div className="import-loading">
                                <h2>Importing...</h2>
                                <p>Please wait while your data is being imported.</p>
                            </div>
                        )}

                        {importStep === "result" && importResult && (
                            <>
                                <h2>Import Complete</h2>
                                <div className="import-result-stats">
                                    {importResult.listsImported > 0 && (
                                        <p>{importResult.listsImported} list{importResult.listsImported !== 1 ? "s" : ""} imported</p>
                                    )}
                                    {importResult.listsMerged > 0 && (
                                        <p>{importResult.listsMerged} list{importResult.listsMerged !== 1 ? "s" : ""} merged</p>
                                    )}
                                    {importResult.templatesImported > 0 && (
                                        <p>{importResult.templatesImported} template{importResult.templatesImported !== 1 ? "s" : ""} imported</p>
                                    )}
                                    {importResult.historyImported > 0 && (
                                        <p>{importResult.historyImported} history item{importResult.historyImported !== 1 ? "s" : ""} imported</p>
                                    )}
                                    {importResult.listsImported === 0 && importResult.listsMerged === 0 && importResult.templatesImported === 0 && importResult.historyImported === 0 && (
                                        <p>No new data was imported.</p>
                                    )}
                                </div>

                                {importResult.skipped.length > 0 && (
                                    <div className="import-skipped">
                                        <h3>Skipped Items ({importResult.skipped.length})</h3>
                                        <ul>
                                            {importResult.skipped.map((item, idx) => (
                                                <li key={idx}>{item}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className="modal-actions">
                                    <button className="submit-btn" onClick={handleCloseImport}>
                                        Done
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
        </div>
    );
}
