export type ApiResponse<T = unknown> = {
    success: boolean;
    data?: T;
    error?: string;
};

export type LoginRequest = {
    password: string;
};

export type CreateListRequest = {
    name: string;
    icon?: string;
};

export type UpdateListRequest = {
    name?: string;
    icon?: string;
    isActive?: boolean;
};

export type ReorderRequest = {
    ids: number[];
};

export type CreateSectionRequest = {
    name: string;
};

export type UpdateSectionRequest = {
    name?: string;
};

export type CreateItemRequest = {
    name: string;
    description?: string;
    quantity?: string;
};

export type UpdateItemRequest = {
    name?: string;
    description?: string | null;
    quantity?: string | null;
    status?: string;
};

export type MoveItemRequest = {
    targetSectionId: number;
};

export type CreateTemplateRequest = {
    name: string;
    items: CreateTemplateItemRequest[];
};

export type CreateTemplateItemRequest = {
    name: string;
    description?: string;
    quantity?: string;
    sectionName?: string;
};

export type ApplyTemplateRequest = {
    listId: number;
    skipExisting?: boolean;
};

export type BatchOperation = {
    type: "create" | "update" | "delete";
    entity: "list" | "section" | "item";
    data: Record<string, unknown>;
    id?: number;
};

export type BatchRequest = {
    operations: BatchOperation[];
};

export type ExportItemData = {
    name: string;
    description: string | null;
    quantity: string | null;
    status: string;
};

export type ExportSectionData = {
    name: string;
    items: ExportItemData[];
};

export type ExportListData = {
    name: string;
    icon: string;
    sections: ExportSectionData[];
};

export type ExportTemplateItemData = {
    name: string;
    description: string | null;
    quantity: string | null;
    sectionName: string | null;
};

export type ExportTemplateData = {
    name: string;
    items: ExportTemplateItemData[];
};

export type ExportHistoryData = {
    name: string;
    sectionName: string | null;
    description: string | null;
    quantity: string | null;
    frequency: number;
};

export type ExportData = {
    version: string;
    exported_at: string;
    lists: ExportListData[];
    templates: ExportTemplateData[];
    history: ExportHistoryData[];
};

export type ExportOptions = {
    listIds?: number[];
    templateIds?: number[];
    includeHistory: boolean;
};

export type ExportSummary = {
    lists: Array<{ id: number; name: string; icon: string; itemCount: number }>;
    templates: Array<{ id: number; name: string; itemCount: number }>;
    historyCount: number;
};

export type ImportPreview = {
    listCount: number;
    templateCount: number;
    historyCount: number;
    existingListConflicts: string[];
    existingTemplateConflicts: string[];
};

export type ImportMode = "merge" | "replace";

export type ImportOptions = {
    mode: ImportMode;
    importLists: boolean;
    importTemplates: boolean;
    importHistory: boolean;
};

export type ImportResult = {
    listsImported: number;
    listsMerged: number;
    templatesImported: number;
    historyImported: number;
    skipped: string[];
};
