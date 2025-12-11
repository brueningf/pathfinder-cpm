export interface Point {
    x: number;
    y: number;
}

export interface Size {
    width: number;
    height: number;
}

export type EntityType = 'process' | 'external_entity' | 'data_store' | 'state' | 'boundary';

export interface DiagramNode {
    id: string;
    type: EntityType;
    name: string;
    description?: string;
    position: Point;
    size?: Size; // Optional, can be calculated or fixed
    level?: number; // For DFD leveling (0, 1, 2...)
    parentId?: string; // For DFD decomposition
    data?: any; // Custom data specific to the node type
}

export interface DiagramConnection {
    id: string;
    sourceId: string;
    targetId: string;
    label?: string; // Data flow name
    type?: 'data_flow' | 'control_flow' | 'transition';
    points?: Point[]; // For custom routing
    sourceArrow?: boolean;
    targetArrow?: boolean;
    lineStyle?: 'straight' | 'orthogonal' | 'curved';
    textPosition?: number; // 0-1 percentage along path
    anchors?: {
        source?: { x: number; y: number; side: 'top' | 'bottom' | 'left' | 'right' };
        target?: { x: number; y: number; side: 'top' | 'bottom' | 'left' | 'right' };
    };
    controlPoints?: Point[]; // Array of 1 or 2 points for Bezier controls
}

export interface DataDictionaryEntry {
    id: string;
    name: string;
    type: 'data_element' | 'data_structure' | 'data_store' | 'process' | 'external_entity' | 'state' | 'boundary';
    definition: string; // Structured English or description
    composition?: string; // For data structures (e.g., "Name + Address + Phone")
    values?: string; // Allowable values
    relatedDiagramIds: string[];
    label?: string; // Process number (e.g. "1.1") or other identifier for sorting
}

export interface ContextDiagram {
    id: string;
    nodes: DiagramNode[];
    connections: DiagramConnection[];
}

export interface DataFlowDiagram {
    id: string;
    level: number;
    parentId?: string; // ID of the parent DFD
    parentProcessId?: string; // ID of the process node this DFD expands
    nodes: DiagramNode[];
    connections: DiagramConnection[];
}

export interface StateTransitionDiagram {
    id: string;
    nodes: DiagramNode[]; // States
    connections: DiagramConnection[]; // Transitions
}

export interface StructuredAnalysisData {
    contextDiagram: ContextDiagram;
    dfds: DataFlowDiagram[];
    dictionary: DataDictionaryEntry[];
    stds: StateTransitionDiagram[];
}
