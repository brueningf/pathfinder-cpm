import React, { useRef, useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, Move } from 'lucide-react';

export interface CanvasNode {
    id: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    content: React.ReactNode;
    resizable?: boolean;
    pointerEvents?: React.CSSProperties['pointerEvents'];
    shape?: 'rectangle' | 'circle' | 'rounded-rectangle' | 'ellipse';
}

export interface CanvasConnection {
    id: string;
    start: { x: number; y: number };
    end: { x: number; y: number };
    color?: string;
    label?: string;
    isSelected?: boolean;
    sourceArrow?: boolean;
    targetArrow?: boolean;
    lineStyle?: 'straight' | 'orthogonal' | 'curved';
    textPosition?: number;
    anchors?: {
        source?: { x: number; y: number; side: 'top' | 'bottom' | 'left' | 'right' };
        target?: { x: number; y: number; side: 'top' | 'bottom' | 'left' | 'right' };
    };
    sourceNodeId?: string;
    targetNodeId?: string;
}

export interface DiagramCanvasProps {
    nodes: CanvasNode[];
    connections: CanvasConnection[];
    onNodeMove: (id: string, x: number, y: number) => void;
    onNodeResize?: (id: string, width: number, height: number) => void;
    onConnectionCreate?: (sourceId: string, targetId: string) => void;
    onConnectionClick?: (id: string, e: React.MouseEvent) => void;
    onBackgroundClick?: (e: React.MouseEvent) => void;
    selectedIds?: string[];
    onSelectionChange?: (ids: string[]) => void;
    isDark: boolean;
    mode?: 'select' | 'connect' | 'pan';
    children?: React.ReactNode;
    zoom: number;
    onZoomChange: (zoom: number) => void;
    pan: { x: number, y: number };
    onPanChange: (pan: { x: number, y: number }) => void;
}

// Helper to get pointer position from Mouse or Touch events
const getPointerPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if ('touches' in e && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if ('changedTouches' in e && e.changedTouches.length > 0) {
        return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }
    if ('clientX' in e) {
        return { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
    }
    return { x: 0, y: 0 };
};

// Helper to calculate intersection between a line (center to center) and a node boundary
const calculateIntersection = (
    center1: { x: number, y: number },
    center2: { x: number, y: number },
    node: CanvasNode
): { x: number, y: number } => {
    const w = node.width || 100;
    const h = node.height || 100;
    const x = node.x;
    const y = node.y;

    const dx = center2.x - center1.x;
    const dy = center2.y - center1.y;

    if (dx === 0 && dy === 0) return center1;

    if (node.shape === 'circle') {
        // Circle intersection
        const angle = Math.atan2(dy, dx);
        const radius = Math.min(w, h) / 2;
        return {
            x: center1.x + radius * Math.cos(angle),
            y: center1.y + radius * Math.sin(angle)
        };
    } else {
        // Rectangle intersection (Cohen-Sutherland-like or simple ray casting)
        // Line equation: P = C1 + t * (C2 - C1)
        // We want to find t where it hits x=x, x=x+w, y=y, y=y+h

        // Check intersection with left/right
        let t1 = Infinity;
        let t2 = Infinity;

        if (dx !== 0) {
            const tLeft = (x - center1.x) / dx;
            const tRight = (x + w - center1.x) / dx;
            // We want positive t (forward direction)
            if (tLeft > 0) t1 = tLeft;
            if (tRight > 0) t1 = Math.min(t1 === Infinity ? Infinity : t1, tRight);
        }

        if (dy !== 0) {
            const tTop = (y - center1.y) / dy;
            const tBottom = (y + h - center1.y) / dy;
            if (tTop > 0) t2 = tTop;
            if (tBottom > 0) t2 = Math.min(t2 === Infinity ? Infinity : t2, tBottom);
        }

        const t = Math.min(t1, t2);

        // If t is valid (should be <= 1 if intersecting, but we just want direction)
        // Actually we want the point on the boundary.
        // Simplified:
        // Calculate intersection with 4 lines
        // Left: x = node.x
        // Right: x = node.x + w
        // Top: y = node.y
        // Bottom: y = node.y + h

        // Angle method might be easier for generic rectangle
        const theta = Math.atan2(dy, dx);
        const tanTheta = Math.tan(theta);

        // Determine which quadrant/side
        // Region 1 (Right): -h/2 <= y <= h/2, x = w/2
        // Region 2 (Bottom): -w/2 <= x <= w/2, y = h/2
        // etc.
        // Relative to center

        const hw = w / 2;
        const hh = h / 2;

        // Check right/left
        if (dx !== 0) {
            const signX = dx > 0 ? 1 : -1;
            const ix = hw * signX;
            const iy = ix * Math.tan(theta);
            if (Math.abs(iy) <= hh) {
                return { x: center1.x + ix, y: center1.y + iy };
            }
        }

        // Check top/bottom
        if (dy !== 0) {
            const signY = dy > 0 ? 1 : -1;
            const iy = hh * signY;
            const ix = iy / Math.tan(theta);
            if (Math.abs(ix) <= hw) {
                return { x: center1.x + ix, y: center1.y + iy };
            }
        }

        if (node.shape === 'ellipse') {
            // Ellipse intersection: Ray from center1 to center2 intersection with (x-cx)^2/rx^2 + (y-cy)^2/ry^2 = 1
            const rx = w / 2;
            const ry = h / 2;
            if (rx === 0 || ry === 0) return center1;

            const t = 1 / Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
            
            return {
                x: center1.x + dx * t,
                y: center1.y + dy * t
            };
        }

        // Fallback for rectangle/rounded-rectangle
        return center1;
    }
};

export const DiagramCanvas: React.FC<DiagramCanvasProps> = ({
    nodes,
    connections,
    onNodeMove,
    onNodeResize,
    onConnectionCreate,
    onConnectionClick,
    onBackgroundClick,
    selectedIds = [],
    onSelectionChange,
    isDark,
    mode = 'select',
    children,
    zoom,
    onZoomChange,
    pan,
    onPanChange
}) => {
    // const [pan, setPan] = useState({ x: 0, y: 0 }); // Lifted to parent
    // const [zoom, setZoom] = useState(1); // Lifted to parent
    const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
    const [initialNodePos, setInitialNodePos] = useState<{ x: number, y: number } | null>(null);

    // Resizing state
    const [isResizing, setIsResizing] = useState(false);
    const [resizingNodeId, setResizingNodeId] = useState<string | null>(null);
    const [initialSize, setInitialSize] = useState<{ width: number, height: number } | null>(null);

    // Connection creation state
    const [isDrawingConnection, setIsDrawingConnection] = useState(false);
    const [connectionStartNodeId, setConnectionStartNodeId] = useState<string | null>(null);
    const [connectionEndPos, setConnectionEndPos] = useState<{ x: number, y: number } | null>(null);

    // Selection Box state
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionBox, setSelectionBox] = useState<{ start: { x: number, y: number }, end: { x: number, y: number } } | null>(null);

    const canvasRef = useRef<HTMLDivElement>(null);

    // Helper to get node center
    const getNodeCenter = (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return { x: 0, y: 0 };
        return {
            x: node.x + (node.width || 0) / 2,
            y: node.y + (node.height || 0) / 2
        };
    };

    // Wheel Zoom
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            onZoomChange(Math.min(Math.max(zoom * delta, 0.2), 3));
        };

        canvas.addEventListener('wheel', handleWheel, { passive: false });
        return () => canvas.removeEventListener('wheel', handleWheel);
    }, []);

    const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
        // If drawing connection, clicking background cancels it
        if (isDrawingConnection) {
            setIsDrawingConnection(false);
            setConnectionStartNodeId(null);
            setConnectionEndPos(null);
            return;
        }

        const pos = getPointerPos(e);
        const isTouch = 'touches' in e;
        const button = isTouch ? 0 : (e as React.MouseEvent).button;

        // Middle mouse or Pan mode triggers canvas drag
        if (button === 1 || mode === 'pan') {
            setIsDraggingCanvas(true);
            setDragStart({ x: pos.x - pan.x, y: pos.y - pan.y });
            onBackgroundClick?.(e as any);
            return;
        }

        // Select mode: Box selection
        if (mode === 'select' && button === 0) {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;

            const x = (pos.x - rect.left - pan.x) / zoom;
            const y = (pos.y - rect.top - pan.y) / zoom;

            setIsSelecting(true);
            setSelectionBox({ start: { x, y }, end: { x, y } });
            onBackgroundClick?.(e as any); // Deselect current selection
        }
    };

    const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
        const pos = getPointerPos(e);

        if (isDraggingCanvas) {
            onPanChange({ x: pos.x - dragStart.x, y: pos.y - dragStart.y });
        } else if (isResizing && resizingNodeId && initialSize) {
            const dx = (pos.x - dragStart.x) / zoom;
            const dy = (pos.y - dragStart.y) / zoom;
            onNodeResize?.(resizingNodeId, Math.max(50, initialSize.width + dx), Math.max(50, initialSize.height + dy));
        } else if (draggedNodeId && initialNodePos && mode === 'select') {
            const dx = (pos.x - dragStart.x) / zoom;
            const dy = (pos.y - dragStart.y) / zoom;

            // Add threshold to prevent accidental moves on click
            if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;

            onNodeMove(draggedNodeId, initialNodePos.x + dx, initialNodePos.y + dy);
        } else if (isDrawingConnection && connectionStartNodeId) {
            // Update temporary connection line
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) {
                setConnectionEndPos({
                    x: (pos.x - rect.left - pan.x) / zoom,
                    y: (pos.y - rect.top - pan.y) / zoom
                });
            }
        } else if (isSelecting && selectionBox) {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) {
                const x = (pos.x - rect.left - pan.x) / zoom;
                const y = (pos.y - rect.top - pan.y) / zoom;
                setSelectionBox({ ...selectionBox, end: { x, y } });
            }
        }
    };

    const handlePointerUp = (e: React.MouseEvent | React.TouchEvent) => {
        if (isSelecting && selectionBox) {
            // Calculate intersection
            const x1 = Math.min(selectionBox.start.x, selectionBox.end.x);
            const y1 = Math.min(selectionBox.start.y, selectionBox.end.y);
            const x2 = Math.max(selectionBox.start.x, selectionBox.end.x);
            const y2 = Math.max(selectionBox.start.y, selectionBox.end.y);

            // Find nodes inside
            const selectedNodes = nodes.filter(node => {
                const nodeRight = node.x + (node.width || 0);
                const nodeBottom = node.y + (node.height || 0);

                // Check intersection (box overlaps node)
                return (
                    node.x < x2 &&
                    nodeRight > x1 &&
                    node.y < y2 &&
                    nodeBottom > y1
                );
            });

            if (selectedNodes.length > 0) {
                const ids = selectedNodes.map(n => n.id);
                if (onSelectionChange) {
                    if (e.ctrlKey || e.shiftKey) {
                        // Add to existing selection (union)
                        const newIds = Array.from(new Set([...selectedIds, ...ids]));
                        onSelectionChange(newIds);
                    } else {
                        // Replace selection
                        onSelectionChange(ids);
                    }
                } else {
                    // Fallback for single select legacy
                    onConnectionClick?.(selectedNodes[0].id, e as any);
                }
            } else {
                // If box is empty and we are not holding modifier, clear selection?
                if (!e.ctrlKey && !e.shiftKey) {
                    onSelectionChange?.([]);
                }
            }

            setIsSelecting(false);
            setSelectionBox(null);
        }

        setIsDraggingCanvas(false);
        setDraggedNodeId(null);
        setInitialNodePos(null);
        setIsResizing(false);
        setResizingNodeId(null);
        setInitialSize(null);
    };

    const handleNodePointerDown = (e: React.MouseEvent | React.TouchEvent, id: string, x: number, y: number) => {
        // Allow elements to opt-out of dragging/selection (e.g. empty space in a boundary)
        if ((e.target as HTMLElement).dataset.diagramIgnore) {
            return;
        }

        e.stopPropagation();
        const pos = getPointerPos(e);
        const isTouch = 'touches' in e;
        const button = isTouch ? 0 : (e as React.MouseEvent).button;

        if (button === 0) {
            if (mode === 'select') {
                setDraggedNodeId(id);
                setDragStart({ x: pos.x, y: pos.y });
                setInitialNodePos({ x, y });
            } else if (mode === 'connect') {
                if (isDrawingConnection && connectionStartNodeId) {
                    // Click-to-Connect: Clicked a second node to complete connection
                    if (connectionStartNodeId !== id) {
                        onConnectionCreate?.(connectionStartNodeId, id);
                        setIsDrawingConnection(false);
                        setConnectionStartNodeId(null);
                        setConnectionEndPos(null);
                    }
                    // If clicked same node, ignore (allow continuing to draw or drag out)
                } else {
                    // Start connection
                    setIsDrawingConnection(true);
                    setConnectionStartNodeId(id);
                    const center = getNodeCenter(id);
                    setConnectionEndPos(center);
                }
            }
        }
    };

    const handleNodePointerUp = (e: React.MouseEvent | React.TouchEvent, id: string) => {
        if (mode === 'connect' && isDrawingConnection && connectionStartNodeId) {
            if (connectionStartNodeId !== id) {
                // Complete connection (Drag-to-Connect or Click-Move-Click)
                onConnectionCreate?.(connectionStartNodeId, id);
                setIsDrawingConnection(false);
                setConnectionStartNodeId(null);
                setConnectionEndPos(null);
            } else {
                // Released on same node: Keep drawing (Click-Move-Click mode)
                // Do nothing, just let it stay in drawing mode
            }
        }
    };

    const handleNodeClick = (e: React.MouseEvent, id: string) => {
        // In connect mode, if we are drawing and click the same node, we might want to cancel?
        // Or if we click a different node, handleNodeMouseUp already handled it.
        // This is mostly for the "Click start" case where MouseDown started it, MouseUp on same node kept it going.
        // Then next click on another node triggers MouseDown (ignored/restarts?) and MouseUp (completes).
        // Actually, if we are already drawing, MouseDown on another node will restart drawing from that node if we aren't careful.
        // We should check if isDrawingConnection in handleNodeMouseDown.
    };

    const handleResizePointerDown = (e: React.MouseEvent | React.TouchEvent, id: string, width: number, height: number) => {
        e.stopPropagation();
        const pos = getPointerPos(e);
        setIsResizing(true);
        setResizingNodeId(id);
        setDragStart({ x: pos.x, y: pos.y });
        setInitialSize({ width, height });
    };

    return (
        <div
            ref={canvasRef}
            className={`w-full h-full relative overflow-hidden ${isDark ? 'bg-slate-950' : 'bg-stone-50'}`}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            style={{
                cursor: mode === 'pan' || isDraggingCanvas ? 'grabbing' : mode === 'connect' ? (isDrawingConnection ? 'crosshair' : 'pointer') : 'default'
            }}
        >
            <div
                style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: '0 0',
                    width: '100%',
                    height: '100%',
                }}
            >
                {/* Grid */}
                <div
                    className="absolute inset-[-1000%] pointer-events-none opacity-40"
                    style={{
                        backgroundImage: `radial-gradient(${isDark ? '#334155' : '#cbd5e1'} 1px, transparent 1px)`,
                        backgroundSize: '24px 24px',
                    }}
                />

                {/* Connections */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                    <defs>
                        <marker id="arrowhead-canvas" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill={isDark ? '#475569' : '#94a3b8'} />
                        </marker>
                        <marker id="arrowhead-canvas-selected" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
                        </marker>
                    </defs>
                    {connections.map(conn => {
                        const strokeColor = conn.color || (isDark ? '#94a3b8' : '#64748b');
                        const isSelected = selectedIds.includes(conn.id);

                        // Calculate path based on style
                        let start = conn.anchors?.source ? { x: conn.anchors.source.x, y: conn.anchors.source.y } : conn.start;
                        let end = conn.anchors?.target ? { x: conn.anchors.target.x, y: conn.anchors.target.y } : conn.end;

                        // Adjust start/end to node boundaries if IDs are provided
                        if (conn.sourceNodeId) {
                            const sourceNode = nodes.find(n => n.id === conn.sourceNodeId);
                            if (sourceNode) {
                                start = calculateIntersection(sourceNode ? getNodeCenter(sourceNode.id) : start, end, sourceNode);
                            }
                        }
                        if (conn.targetNodeId) {
                            const targetNode = nodes.find(n => n.id === conn.targetNodeId);
                            if (targetNode) {
                                end = calculateIntersection(targetNode ? getNodeCenter(targetNode.id) : end, start, targetNode);
                            }
                        }

                        let d = '';

                        if (conn.lineStyle === 'orthogonal') {
                            const midX = (start.x + end.x) / 2;
                            d = `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
                        } else if (conn.lineStyle === 'curved') {
                            const dx = Math.abs(end.x - start.x);
                            const controlPointOffset = Math.max(dx * 0.5, 50);
                            d = `M ${start.x} ${start.y} C ${start.x + controlPointOffset} ${start.y}, ${end.x - controlPointOffset} ${end.y}, ${end.x} ${end.y}`;
                        } else {
                            d = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
                        }

                        // Calculate text position
                        let textX = (start.x + end.x) / 2;
                        let textY = (start.y + end.y) / 2;

                        if (conn.textPosition !== undefined) {
                            // Simple linear interpolation for now, ideally would follow path
                            textX = start.x + (end.x - start.x) * conn.textPosition;
                            textY = start.y + (end.y - start.y) * conn.textPosition;
                        }

                        return (
                            <g
                                key={conn.id}
                                className="group cursor-pointer"
                            >
                                {/* Transparent hit area */}
                                <path
                                    d={d}
                                    stroke="transparent"
                                    strokeWidth="15"
                                    fill="none"
                                    pointerEvents="stroke"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onSelectionChange) {
                                            if (e.ctrlKey || e.shiftKey) {
                                                if (selectedIds.includes(conn.id)) {
                                                    onSelectionChange(selectedIds.filter(id => id !== conn.id));
                                                } else {
                                                    onSelectionChange([...selectedIds, conn.id]);
                                                }
                                            } else {
                                                onSelectionChange([conn.id]);
                                            }
                                        } else {
                                            onConnectionClick?.(conn.id, e);
                                        }
                                    }}
                                />
                                {/* Visible line */}
                                <path
                                    d={d}
                                    stroke={isSelected ? '#3b82f6' : strokeColor}
                                    strokeWidth={isSelected ? 3 : 2}
                                    fill="none"
                                    markerStart={conn.sourceArrow ? `url(#arrowhead-start-${conn.id})` : undefined}
                                    markerEnd={conn.targetArrow ? `url(#arrowhead-end-${conn.id})` : undefined}
                                />

                                {/* Markers definitions for this connection (to handle colors/selection) */}
                                <defs>
                                    <marker
                                        id={`arrowhead-start-${conn.id}`}
                                        markerWidth="10"
                                        markerHeight="7"
                                        refX="0"
                                        refY="3.5"
                                        orient="auto"
                                    >
                                        <polygon points="10 0, 10 7, 0 3.5" fill={isSelected ? '#3b82f6' : strokeColor} />
                                    </marker>
                                    <marker
                                        id={`arrowhead-end-${conn.id}`}
                                        markerWidth="10"
                                        markerHeight="7"
                                        refX="10"
                                        refY="3.5"
                                        orient="auto"
                                    >
                                        <polygon points="0 0, 10 3.5, 0 7" fill={isSelected ? '#3b82f6' : strokeColor} />
                                    </marker>
                                </defs>

                                {/* Label */}
                                {conn.label && (
                                    <foreignObject
                                        x={textX - 50}
                                        y={textY - 12}
                                        width="100"
                                        height="24"
                                        style={{ overflow: 'visible' }}
                                    >
                                        <div className={`text-xs text-center px-1 rounded border shadow-sm whitespace-nowrap w-fit mx-auto ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-stone-200 text-stone-600'
                                            } ${isSelected ? 'ring-1 ring-blue-500 border-blue-500' : ''}`}>
                                            {conn.label}
                                        </div>
                                    </foreignObject>
                                )}
                            </g>
                        );
                    })}

                    {/* Temporary Connection Line */}
                    {isDrawingConnection && connectionStartNodeId && connectionEndPos && (
                        <line
                            x1={getNodeCenter(connectionStartNodeId).x}
                            y1={getNodeCenter(connectionStartNodeId).y}
                            x2={connectionEndPos.x}
                            y2={connectionEndPos.y}
                            stroke={isDark ? '#cbd5e1' : '#475569'}
                            strokeWidth="2"
                            strokeDasharray="5,5"
                            markerEnd="url(#arrowhead-canvas)"
                        />
                    )}
                </svg>

                {/* Selection Box */}
                {isSelecting && selectionBox && (
                    <div
                        className={`absolute border ${isDark ? 'border-blue-400 bg-blue-400/10' : 'border-blue-500 bg-blue-500/10'}`}
                        style={{
                            left: Math.min(selectionBox.start.x, selectionBox.end.x),
                            top: Math.min(selectionBox.start.y, selectionBox.end.y),
                            width: Math.abs(selectionBox.end.x - selectionBox.start.x),
                            height: Math.abs(selectionBox.end.y - selectionBox.start.y),
                            pointerEvents: 'none'
                        }}
                    />
                )}

                {/* Nodes */}
                {nodes.map(node => (
                    <div
                        key={node.id}
                        className={`absolute group ${selectedIds.includes(node.id) ? 'ring-2 ring-blue-500' : ''}`}
                        style={{
                            transform: `translate(${node.x}px, ${node.y}px)`,
                            width: node.width,
                            height: node.height,
                            cursor: draggedNodeId || isResizing ? 'grabbing' : 'grab',
                            touchAction: 'none',
                            pointerEvents: node.pointerEvents
                        }}
                        onMouseDown={(e) => {
                            handleNodePointerDown(e, node.id, node.x, node.y);
                            // Ensure selection happens on click
                            if (mode === 'select') {
                                e.stopPropagation();
                                if (onSelectionChange) {
                                    if (e.ctrlKey || e.shiftKey) {
                                        if (selectedIds.includes(node.id)) {
                                            onSelectionChange(selectedIds.filter(id => id !== node.id));
                                        } else {
                                            onSelectionChange([...selectedIds, node.id]);
                                        }
                                    } else {
                                        // If already selected and dragging, don't deselect others immediately (handled by drag logic usually, but here we just select)
                                        // Actually, standard behavior: if clicking an unselected node, select only it. If clicking a selected node, keep selection (for drag).
                                        if (!selectedIds.includes(node.id)) {
                                            onSelectionChange([node.id]);
                                        }
                                    }
                                } else {
                                    onConnectionClick?.(node.id, e);
                                }
                            }
                        }}
                        onTouchStart={(e) => {
                            handleNodePointerDown(e, node.id, node.x, node.y);
                            // Ensure selection happens on click
                            if (mode === 'select') {
                                e.stopPropagation();
                                if (onSelectionChange) {
                                    // No ctrl/shift on touch usually, so just select
                                    if (!selectedIds.includes(node.id)) {
                                        onSelectionChange([node.id]);
                                    }
                                } else {
                                    onConnectionClick?.(node.id, e as any);
                                }
                            }
                        }}
                        onMouseUp={(e) => handleNodePointerUp(e, node.id)}
                        onTouchEnd={(e) => handleNodePointerUp(e, node.id)}
                        onClick={(e) => {
                            e.stopPropagation();
                            // Handle simple click selection if not handled by MouseDown (e.g. to clear others if clicked without drag)
                            if (mode === 'select' && !e.ctrlKey && !e.shiftKey && selectedIds.includes(node.id) && selectedIds.length > 1 && !draggedNodeId) {
                                // If we clicked a selected node in a multi-selection and didn't drag, select ONLY this node
                                onSelectionChange?.([node.id]);
                            }
                        }}
                    >
                        {node.content}
                        {/* Resize Handle */}
                        {node.resizable && mode === 'select' && (
                            <div
                                className={`absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'bg-slate-600' : 'bg-stone-400'}`}
                                onMouseDown={(e) => handleResizePointerDown(e, node.id, node.width || 100, node.height || 100)}
                                onTouchStart={(e) => handleResizePointerDown(e, node.id, node.width || 100, node.height || 100)}
                                style={{ borderTopLeftRadius: '4px' }}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Controls */}
            {/* Controls moved to parent */}

            {children}
        </div>
    );
};
