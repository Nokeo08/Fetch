import type { ApiResponse, ExportData, ExportOptions, ExportSummary, ImportPreview, ImportOptions, ImportResult } from "shared/dist";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

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

function downloadJson(data: unknown, filename: string): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}


function formatDateForFilename(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export const importExportApi = {
    async getExportSummary(): Promise<ExportSummary> {
        const response = await fetchApi<ExportSummary>("/api/v1/export/summary");
        if (!response.success || !response.data) {
            throw new Error(response.error || "Failed to load export summary");
        }
        return response.data;
    },

    async exportData(options: ExportOptions): Promise<void> {
        const response = await fetchApi<ExportData>("/api/v1/export", {
            method: "POST",
            body: JSON.stringify(options),
        });
        if (!response.success || !response.data) {
            throw new Error(response.error || "Export failed");
        }
        const filename = `fetch-backup-${formatDateForFilename(new Date())}.json`;
        downloadJson(response.data, filename);
    },

    async previewImport(data: ExportData): Promise<ImportPreview> {
        const response = await fetchApi<ImportPreview>("/api/v1/import/preview", {
            method: "POST",
            body: JSON.stringify(data),
        });
        if (!response.success || !response.data) {
            throw new Error(response.error || "Preview failed");
        }
        return response.data;
    },

    async importData(data: ExportData, options: ImportOptions): Promise<ImportResult> {
        const response = await fetchApi<ImportResult>("/api/v1/import", {
            method: "POST",
            body: JSON.stringify({ data, options }),
        });
        if (!response.success || !response.data) {
            throw new Error(response.error || "Import failed");
        }
        return response.data;
    },
};
