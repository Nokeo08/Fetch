const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

export type ApiResponse<T = unknown> = {
    success: boolean;
    data?: T;
    error?: string;
};

export type Section = {
    id: number;
    listId: number;
    name: string;
    sortOrder: number;
    createdAt: string;
};

export type Item = {
    id: number;
    sectionId: number;
    name: string;
    description: string | null;
    quantity: string | null;
    status: "active" | "completed" | "uncertain";
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
};

export type SectionWithItems = Section & {
    items: Item[];
};

async function fetchApi<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
    const res = await fetch(`${SERVER_URL}${path}`, {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers,
        },
    });
    return res.json() as Promise<ApiResponse<T>>;
}

export const sectionsApi = {
    getByListId: (listId: number) =>
        fetchApi<SectionWithItems[]>(`/api/v1/lists/${listId}/sections`),

    getById: (id: number) =>
        fetchApi<Section>(`/api/v1/sections/${id}`),

    create: (listId: number, name: string) =>
        fetchApi<Section>(`/api/v1/lists/${listId}/sections`, {
            method: "POST",
            body: JSON.stringify({ name }),
        }),

    update: (id: number, name: string) =>
        fetchApi<Section>(`/api/v1/sections/${id}`, {
            method: "PUT",
            body: JSON.stringify({ name }),
        }),

    delete: (id: number) =>
        fetchApi<void>(`/api/v1/sections/${id}`, {
            method: "DELETE",
        }),

    reorder: (sectionIds: number[]) =>
        fetchApi<void>("/api/v1/sections/reorder", {
            method: "POST",
            body: JSON.stringify({ ids: sectionIds }),
        }),
};

export const itemsApi = {
    create: (sectionId: number, name: string, description?: string, quantity?: string) =>
        fetchApi<Item>(`/api/v1/sections/${sectionId}/items`, {
            method: "POST",
            body: JSON.stringify({ name, description, quantity }),
        }),

    update: (id: number, data: { name?: string; description?: string | null; quantity?: string | null; status?: string }) =>
        fetchApi<Item>(`/api/v1/items/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        }),

    delete: (id: number) =>
        fetchApi<void>(`/api/v1/items/${id}`, {
            method: "DELETE",
        }),

    reorder: (itemIds: number[]) =>
        fetchApi<void>("/api/v1/items/reorder", {
            method: "POST",
            body: JSON.stringify({ ids: itemIds }),
        }),

    move: (id: number, targetSectionId: number) =>
        fetchApi<Item>(`/api/v1/items/${id}/move`, {
            method: "POST",
            body: JSON.stringify({ targetSectionId }),
        }),
};
