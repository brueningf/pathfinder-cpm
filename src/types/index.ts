export interface Task {
    id: string;
    name: string;
    duration: number;
    predecessors: string[];
    type?: 'task' | 'start' | 'end';
    resources?: string[]; // e.g. "Alice", "Bob"
    cost?: number;
    // Computed values (optional, populated after calculation)
    es?: number;
    ef?: number;
    ls?: number;
    lf?: number;
    slack?: number;
    isCritical?: boolean;
    // Manual overrides
    manualES?: number | string;
    manualEF?: number | string;
    manualLS?: number | string;
    manualLF?: number | string;
    manualSlack?: number | string;
    manualCritical?: 'auto' | 'true' | 'false';
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

export interface Requirement {
    id: string;
    title: string;
    description: string; // User story format preferred
    priority: 'Must' | 'Should' | 'Could' | 'Won\'t';
    type: 'Functional' | 'Non-Functional';
    status: 'Draft' | 'Pending' | 'Approved' | 'Rejected';
}

export interface Project {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    data: Task[];
    requirements?: Requirement[];
    taskCount: number;
}

export interface CPMResult {
    processedTasks: ProcessedTask[];
    projectDuration: number;
    criticalPath: string[];
    error: string | null;
}

export interface LayoutNode extends ProcessedTask {
    x: number;
    y: number;
    level: number;
}
