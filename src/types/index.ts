export interface Task {
    id: string;
    name: string;
    duration: number;
    predecessors: string[];
    manualSlack?: number | null | string;
    manualCritical?: 'auto' | 'true' | 'false' | string;
    manualES?: number | null | string;
    manualEF?: number | null | string;
    manualLS?: number | null | string;
    manualLF?: number | null | string;
}

export interface ProcessedTask extends Task {
    es: number;
    ef: number;
    ls: number;
    lf: number;
    slack: number;
    isCritical: boolean;
    x?: number;
    y?: number;
}

export interface Project {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    data: Task[];
    taskCount: number;
}

export interface CPMResult {
    error: string | null;
    processedTasks: ProcessedTask[];
    projectDuration: number;
}

export interface LayoutNode extends ProcessedTask {
    x: number;
    y: number;
}
