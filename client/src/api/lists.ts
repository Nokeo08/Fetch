const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3000";

export type ApiResponse<T = unknown> = {
    success: boolean;
    data?: T;
    error?: string;
};

export type ShoppingList = {
    id: number;
    name: string;
    icon: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
};

export type ListWithCounts = ShoppingList & {
    itemCount: number;
    sectionCount: number;
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

export const listsApi = {
    getAll: () => fetchApi<ListWithCounts[]>("/api/v1/lists"),

    getById: (id: number) => fetchApi<ShoppingList>(`/api/v1/lists/${id}`),

    create: (name: string, icon?: string) =>
        fetchApi<ShoppingList>("/api/v1/lists", {
            method: "POST",
            body: JSON.stringify({ name, icon }),
        }),

    update: (id: number, data: { name?: string; icon?: string; isActive?: boolean }) =>
        fetchApi<ShoppingList>(`/api/v1/lists/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        }),

    delete: (id: number) =>
        fetchApi<void>(`/api/v1/lists/${id}`, {
            method: "DELETE",
        }),

    activate: (id: number) =>
        fetchApi<ShoppingList>(`/api/v1/lists/${id}/activate`, {
            method: "POST",
        }),

    reorder: (ids: number[]) =>
        fetchApi<void>("/api/v1/lists/reorder", {
            method: "POST",
            body: JSON.stringify({ ids }),
        }),
};
