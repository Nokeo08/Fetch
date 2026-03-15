import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { importExportApi } from "./api/import-export";
import type { ExportData, ExportSummary, ExportOptions, ImportPreview, ImportMode } from "shared/dist";
import { useTranslation } from "./i18n/index";
import type { SupportedLanguage } from "./i18n/index";
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
    const { t, language, setLanguage, languages } = useTranslation();
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
            setSelectedTemplateIds(new Set(summary.templates.map((tmpl) => tmpl.id)));
            setExportHistory(true);
            setShowExportModal(true);
        } catch (err) {
            const message = err instanceof Error ? err.message : t("exportModal.failedToLoad");
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
            showToast(t("exportModal.exportSuccess"));
            handleCloseExport();
        } catch (err) {
            const message = err instanceof Error ? err.message : t("exportModal.exportFailed");
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
            setSelectedTemplateIds(new Set(exportSummary.templates.map((tmpl) => tmpl.id)));
        }
    };

    const exportHasSelection = selectedListIds.size > 0 || selectedTemplateIds.size > 0 || exportHistory;

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            showToast(t("importModal.fileTooLarge"), "error");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        if (!file.name.endsWith(".json")) {
            showToast(t("importModal.onlyJson"), "error");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        try {
            const text = await file.text();
            let raw: unknown;
            try {
                raw = JSON.parse(text);
            } catch {
                showToast(t("importModal.invalidJson"), "error");
                if (fileInputRef.current) fileInputRef.current.value = "";
                return;
            }

            const obj = raw as Record<string, unknown>;
            if (!(obj.version && obj.exported_at && Array.isArray(obj.lists))) {
                showToast(t("importModal.unrecognizedFormat"), "error");
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
            const message = err instanceof Error ? err.message : t("importModal.failedToRead");
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
            const message = err instanceof Error ? err.message : t("importModal.importFailed");
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
                    <span className="back-arrow">←</span>
                    <span className="back-text">{t("common.back")}</span>
                </button>
                <h1>{t("settings.title")}</h1>
            </div>

            <div className="settings-section">
                <h2>{t("settings.language")}</h2>
                <div className="settings-card">
                    <div className="settings-card-header">
                        <h3>{t("settings.language")}</h3>
                        <p className="settings-card-description">
                            {t("settings.languageDescription")}
                        </p>
                    </div>
                    <div className="language-selector">
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                className={`language-option ${language === lang.code ? "active" : ""}`}
                                onClick={() => setLanguage(lang.code as SupportedLanguage)}
                            >
                                <span className="language-native-name">{lang.nativeName}</span>
                                <span className="language-code">{lang.code}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="settings-section">
                <h2>{t("settings.dataManagement")}</h2>

                <div className="settings-card">
                    <div className="settings-card-header">
                        <h3>{t("settings.exportTitle")}</h3>
                        <p className="settings-card-description">
                            {t("settings.exportDescription")}
                        </p>
                    </div>
                    <button
                        className="settings-action-btn export-btn"
                        onClick={handleOpenExport}
                        disabled={isLoadingSummary}
                    >
                        {isLoadingSummary ? t("settings.exportLoading") : t("settings.exportBtn")}
                    </button>
                </div>

                <div className="settings-card">
                    <div className="settings-card-header">
                        <h3>{t("settings.importTitle")}</h3>
                        <p className="settings-card-description">
                            {t("settings.importDescription")}
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
                        {t("settings.importBtn")}
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
                        <h2>{t("exportModal.title")}</h2>

                        {exportSummary.lists.length > 0 && (
                            <div className="export-group">
                                <div className="export-group-header">
                                    <label className="option-label">{t("exportModal.lists")}</label>
                                    <button
                                        className="select-toggle-btn"
                                        onClick={toggleAllLists}
                                    >
                                        {selectedListIds.size === exportSummary.lists.length ? t("exportModal.deselectAll") : t("exportModal.selectAll")}
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
                                            <span className="export-item-count">{list.itemCount !== 1 ? t("exportModal.itemCount", { count: list.itemCount }) : t("exportModal.itemCountSingular", { count: list.itemCount })}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {exportSummary.templates.length > 0 && (
                            <div className="export-group">
                                <div className="export-group-header">
                                    <label className="option-label">{t("exportModal.templates")}</label>
                                    <button
                                        className="select-toggle-btn"
                                        onClick={toggleAllTemplates}
                                    >
                                        {selectedTemplateIds.size === exportSummary.templates.length ? t("exportModal.deselectAll") : t("exportModal.selectAll")}
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
                                            <span className="export-item-count">{template.itemCount !== 1 ? t("exportModal.itemCount", { count: template.itemCount }) : t("exportModal.itemCountSingular", { count: template.itemCount })}</span>
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
                                    <span className="export-item-name">{t("exportModal.history")}</span>
                                    <span className="export-item-count">{exportSummary.historyCount !== 1 ? t("exportModal.itemCount", { count: exportSummary.historyCount }) : t("exportModal.itemCountSingular", { count: exportSummary.historyCount })}</span>
                                </label>
                            </div>
                        )}

                        {exportSummary.lists.length === 0 && exportSummary.templates.length === 0 && exportSummary.historyCount === 0 && (
                            <p className="export-empty">{t("exportModal.emptyState")}</p>
                        )}

                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={handleCloseExport}>
                                {t("common.cancel")}
                            </button>
                            <button
                                className="submit-btn"
                                onClick={handleExport}
                                disabled={isExporting || !exportHasSelection}
                            >
                                {isExporting ? t("exportModal.exporting") : t("settings.exportBtn")}
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
                                <h2>{t("importModal.previewTitle")}</h2>
                                <div className="import-preview-stats">
                                    <div className="preview-stat">
                                        <span className="stat-count">{importPreview.listCount}</span>
                                        <span className="stat-label">{t("importModal.listsLabel")}</span>
                                    </div>
                                    <div className="preview-stat">
                                        <span className="stat-count">{importPreview.templateCount}</span>
                                        <span className="stat-label">{t("importModal.templatesLabel")}</span>
                                    </div>
                                    <div className="preview-stat">
                                        <span className="stat-count">{importPreview.historyCount}</span>
                                        <span className="stat-label">{t("importModal.historyLabel")}</span>
                                    </div>
                                </div>

                                {(importPreview.existingListConflicts.length > 0 || importPreview.existingTemplateConflicts.length > 0) && (
                                    <div className="import-conflicts">
                                        <h3>{t("importModal.conflictsTitle")}</h3>
                                        {importPreview.existingListConflicts.length > 0 && (
                                            <div className="conflict-group">
                                                <p className="conflict-label">{t("importModal.conflictsLists")}</p>
                                                <ul>
                                                    {importPreview.existingListConflicts.map((name) => (
                                                        <li key={name}>{name}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {importPreview.existingTemplateConflicts.length > 0 && (
                                            <div className="conflict-group">
                                                <p className="conflict-label">{t("importModal.conflictsTemplates")}</p>
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
                                        {t("common.cancel")}
                                    </button>
                                    <button className="submit-btn" onClick={handleProceedToOptions}>
                                        {t("importModal.continue")}
                                    </button>
                                </div>
                            </>
                        )}

                        {importStep === "options" && (
                            <>
                                <h2>{t("importModal.optionsTitle")}</h2>

                                {importError && (
                                    <div className="error-message">{importError}</div>
                                )}

                                <div className="import-options">
                                    <div className="option-group">
                                        <label className="option-label">{t("importModal.importModeLabel")}</label>
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
                                                    <span className="radio-label">{t("importModal.mergeName")}</span>
                                                    <span className="radio-description">{t("importModal.mergeDescription")}</span>
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
                                                    <span className="radio-label">{t("importModal.replaceName")}</span>
                                                    <span className="radio-description">{t("importModal.replaceDescription")}</span>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="option-group">
                                        <label className="option-label">{t("importModal.whatToImport")}</label>
                                        <div className="checkbox-options">
                                            <label className="checkbox-option">
                                                <input
                                                    type="checkbox"
                                                    checked={importLists}
                                                    onChange={(e) => setImportLists(e.target.checked)}
                                                />
                                                <span>{t("importModal.listsCount", { count: importPreview?.listCount ?? 0 })}</span>
                                            </label>
                                            <label className="checkbox-option">
                                                <input
                                                    type="checkbox"
                                                    checked={importTemplates}
                                                    onChange={(e) => setImportTemplates(e.target.checked)}
                                                />
                                                <span>{t("importModal.templatesCount", { count: importPreview?.templateCount ?? 0 })}</span>
                                            </label>
                                            <label className="checkbox-option">
                                                <input
                                                    type="checkbox"
                                                    checked={importHistory}
                                                    onChange={(e) => setImportHistory(e.target.checked)}
                                                />
                                                <span>{t("importModal.historyCount", { count: importPreview?.historyCount ?? 0 })}</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-actions">
                                    <button className="cancel-btn" onClick={() => setImportStep("preview")}>
                                        {t("common.back")}
                                    </button>
                                    <button
                                        className="submit-btn"
                                        onClick={handleImport}
                                        disabled={!importLists && !importTemplates && !importHistory}
                                    >
                                        {t("importModal.import")}
                                    </button>
                                </div>
                            </>
                        )}

                        {importStep === "importing" && (
                            <div className="import-loading">
                                <h2>{t("importModal.importingTitle")}</h2>
                                <p>{t("importModal.importingMessage")}</p>
                            </div>
                        )}

                        {importStep === "result" && importResult && (
                            <>
                                <h2>{t("importModal.resultTitle")}</h2>
                                <div className="import-result-stats">
                                    {importResult.listsImported > 0 && (
                                        <p>{importResult.listsImported !== 1
                                            ? t("importModal.listsImported", { count: importResult.listsImported })
                                            : t("importModal.listImported", { count: importResult.listsImported })}</p>
                                    )}
                                    {importResult.listsMerged > 0 && (
                                        <p>{importResult.listsMerged !== 1
                                            ? t("importModal.listsMerged", { count: importResult.listsMerged })
                                            : t("importModal.listMerged", { count: importResult.listsMerged })}</p>
                                    )}
                                    {importResult.templatesImported > 0 && (
                                        <p>{importResult.templatesImported !== 1
                                            ? t("importModal.templatesImported", { count: importResult.templatesImported })
                                            : t("importModal.templateImported", { count: importResult.templatesImported })}</p>
                                    )}
                                    {importResult.historyImported > 0 && (
                                        <p>{importResult.historyImported !== 1
                                            ? t("importModal.historyImported", { count: importResult.historyImported })
                                            : t("importModal.historyItemImported", { count: importResult.historyImported })}</p>
                                    )}
                                    {importResult.listsImported === 0 && importResult.listsMerged === 0 && importResult.templatesImported === 0 && importResult.historyImported === 0 && (
                                        <p>{t("importModal.noDataImported")}</p>
                                    )}
                                </div>

                                {importResult.skipped.length > 0 && (
                                    <div className="import-skipped">
                                        <h3>{t("importModal.skippedItems", { count: importResult.skipped.length })}</h3>
                                        <ul>
                                            {importResult.skipped.map((item, idx) => (
                                                <li key={idx}>{item}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className="modal-actions">
                                    <button className="submit-btn" onClick={handleCloseImport}>
                                        {t("common.done")}
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
