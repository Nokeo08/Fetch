import type { Template, TemplateItem, ApiResponse } from "shared/dist";

type TemplateWithItems = Template & {
    items: TemplateItem[];
};

type ApplyTemplateResult = {
    added: number;
    skipped: string[];
};

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3000";

async function fetchApi<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
    const res = await fetch(`${SERVER_URL}${path}`, {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers,
        },
    });

    const data = await res.json();
    return data as ApiResponse<T>;
}

export const templatesApi = {
    getAll: () => fetchApi<TemplateWithItems[]>("/api/v1/templates"),

    getById: (id: number) => fetchApi<TemplateWithItems>(`/api/v1/templates/${id}`),

    create: (name: string) =>
        fetchApi<Template>("/api/v1/templates", {
            method: "POST",
            body: JSON.stringify({ name }),
        }),

    update: (id: number, name: string) =>
        fetchApi<Template>(`/api/v1/templates/${id}`, {
            method: "PUT",
            body: JSON.stringify({ name }),
        }),

    delete: (id: number) =>
        fetchApi<void>(`/api/v1/templates/${id}`, {
            method: "DELETE",
        }),

    addItem: (templateId: number, name: string, options?: { description?: string; quantity?: string; sectionName?: string }) =>
        fetchApi<TemplateItem>(`/api/v1/templates/${templateId}/items`, {
            method: "POST",
            body: JSON.stringify({ name, ...options }),
        }),

    updateItem: (templateId: number, itemId: number, data: { name?: string; description?: string | null; quantity?: string | null; sectionName?: string | null }) =>
        fetchApi<TemplateItem>(`/api/v1/templates/${templateId}/items/${itemId}`, {
            method: "PUT",
            body: JSON.stringify(data),
        }),

    deleteItem: (templateId: number, itemId: number) =>
        fetchApi<void>(`/api/v1/templates/${templateId}/items/${itemId}`, {
            method: "DELETE",
        }),

    reorderItems: (templateId: number, ids: number[]) =>
        fetchApi<void>(`/api/v1/templates/${templateId}/reorder`, {
            method: "POST",
            body: JSON.stringify({ ids }),
        }),

    applyToList: (templateId: number, listId: number, itemIds?: number[]) =>
        fetchApi<ApplyTemplateResult>(`/api/v1/templates/${templateId}/apply`, {
            method: "POST",
            body: JSON.stringify({ listId, itemIds }),
        }),

    createFromList: (listId: number, name: string, sectionIds?: number[]) =>
        fetchApi<TemplateWithItems>(`/api/v1/lists/${listId}/template`, {
            method: "POST",
            body: JSON.stringify({ name, sectionIds }),
        }),
};

export type { TemplateWithItems, ApplyTemplateResult };
