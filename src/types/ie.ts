import { Point, Size } from './diagram';

// --- Step 1: Data Modeling (ERD) ---

export type AttributeType = 'string' | 'number' | 'date' | 'boolean' | 'currency';

export interface Attribute {
    id: string;
    name: string;
    type: AttributeType;
    isPrimaryKey: boolean;
    isForeignKey: boolean;
    isOptional: boolean;
    description?: string;
}

export interface Entity {
    id: string;
    name: string;
    description?: string;
    attributes: Attribute[];
    isWeak?: boolean; // Representations: Double rectangle
    // Visual properties for the diagram (View State) - persisted here for simplicity
    position: Point;
    size: Size;
}

export type Cardinality = 'zero_one' | 'one_one' | 'zero_many' | 'one_many';

export interface Relationship {
    id: string;
    sourceEntityId: string;
    targetEntityId: string;
    sourceCardinality: Cardinality;
    targetCardinality: Cardinality;
    label?: string; // e.g. "places", "contains"
    description?: string;
    // Visual routing points
    controlPoints?: Point[];
    // For Chen's notation (Diamond node)
    position?: Point; 
}

// --- Step 2: Functional Decomposition (FDD) ---

export type ProcessType = 'function' | 'activity' | 'process';

export interface ProcessNode {
    id: string;
    name: string;
    type: ProcessType;
    parentId?: string; // Tree structure (undefined = Root Function)
    description?: string;
    level: number; // 0=Root, 1=System, 2=Subsystem...
    // For FDD Diagram layout
    position: Point; 
    size: Size;
}

// --- Step 3: Process Dependency (PDD) ---

export type ProcessDependencyType = 'sequence' | 'selection' | 'iteration';

export interface ProcessDependency {
    id: string;
    sourceProcessId: string;
    sourceTriggerId?: string; // If initiated by a trigger
    targetProcessId: string;
    type: ProcessDependencyType;
    label?: string; // e.g., condition for selection "If valid"
    lineStyle?: 'straight' | 'orthogonal' | 'curved';
    // User overrides for anchors
    sourceAnchorSide?: 'top' | 'bottom' | 'left' | 'right';
    sourceAnchorOffset?: number; // 0..1
    targetAnchorSide?: 'top' | 'bottom' | 'left' | 'right';
    targetAnchorOffset?: number; // 0..1
    controlPoints?: Point[]; // Consolidated name from 'points'
}

// --- Step 4: Process Data Flow (PDFD) ---

export interface DataFlowRef {
    id: string;
    id: string;
    processDependencyId?: string; // Optional: specific transition
    processId?: string; // Optional: direct link to process (if not specific to a transition)
    entityId: string; // The data being passed (Data Store)
    accessType: 'create' | 'read' | 'update' | 'delete';
    isTrigger?: boolean; // Control flow implication
    // Visual properties
    lineStyle?: 'straight' | 'orthogonal' | 'curved';
    sourceAnchorSide?: 'top' | 'bottom' | 'left' | 'right';
    sourceAnchorOffset?: number;
    targetAnchorSide?: 'top' | 'bottom' | 'left' | 'right';
    targetAnchorOffset?: number;
    controlPoints?: Point[]; // Bezier control points for curved lines
}

// --- Trigger Nodes (PDFD Specific) ---

export interface TriggerNode {
    id: string;
    name: string;
    description?: string;
    position: Point;
    // Visuals only?
}

// --- Project Repository (The Single Source of Truth) ---

export interface ProjectRepository {
    // Metadata
    id: string;
    name: string;
    currentStep: 1 | 2 | 3 | 4 | 5;

    // Step 1: Data
    entities: Record<string, Entity>;
    relationships: Record<string, Relationship>;

    // Step 2: Functions
    processes: Record<string, ProcessNode>;

    // Step 3: Dependencies (PDD)
    processDependencies: Record<string, ProcessDependency>;

    // Step 4: Data Flows
    dataFlows: Record<string, DataFlowRef>;
    
    // Step 4.1: Triggers
    triggers: Record<string, TriggerNode>;
}

// Initial Empty State
export const createEmptyProject = (): ProjectRepository => ({
    id: crypto.randomUUID(),
    name: 'New IE Project',
    currentStep: 1,
    entities: {},
    relationships: {},
    processes: {},
    processDependencies: {},
    dataFlows: {},
    triggers: {}
});
