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
