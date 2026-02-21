export type ItemStatus = "active" | "completed" | "uncertain";

export type ShoppingList = {
    id: number;
    name: string;
    icon: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
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
    status: ItemStatus;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
};

export type HistoryEntry = {
    id: number;
    name: string;
    sectionName: string | null;
    description: string | null;
    quantity: string | null;
    frequency: number;
    lastUsed: string;
};

export type Template = {
    id: number;
    name: string;
    createdAt: string;
};

export type TemplateItem = {
    id: number;
    templateId: number;
    name: string;
    description: string | null;
    quantity: string | null;
    sectionName: string | null;
    sortOrder: number;
};

export type ListWithCounts = ShoppingList & {
    itemCount: number;
    sectionCount: number;
};

export type SectionWithItems = Section & {
    items: Item[];
};
