import { CanvasNode } from '../components/common/DiagramCanvas';
import { DiagramBounds, Point, Side, ViewState } from '../types/diagram';

export const getNodeCenter = (node: CanvasNode): Point => {
    const width = node.width || 0;
    const height = node.height || 0;
    return {
        x: node.x + width / 2,
        y: node.y + height / 2
    };
};

export const getDiagramBounds = (nodes: CanvasNode[]): DiagramBounds => {
    if (nodes.length === 0) {
        return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodes.forEach(node => {
        const x = node.x;
        const y = node.y;
        const width = node.width || 0;
        const height = node.height || 0;

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + width);
        maxY = Math.max(maxY, y + height);
    });

    return {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2
    };
};

export const calculateFitToView = (
    bounds: DiagramBounds,
    containerWidth: number,
    containerHeight: number,
    padding: number = 50
): ViewState => {
    if (bounds.width === 0 || bounds.height === 0 || containerWidth === 0 || containerHeight === 0) {
        return { zoom: 1, pan: { x: 0, y: 0 } };
    }

    const availableWidth = containerWidth - (padding * 2);
    const availableHeight = containerHeight - (padding * 2);

    const zoomX = availableWidth / bounds.width;
    const zoomY = availableHeight / bounds.height;
    
    // Use the comprehensive zoom level that fits both dimensions
    // Clamp zoom to reasonable limits (e.g. 0.1 to 2)
    const zoom = Math.min(Math.max(Math.min(zoomX, zoomY), 0.1), 1.5);

    // Calculate Pan to center the content
    // The content center at scale 'zoom' should be at the container center
    // pan.x + (bounds.centerX * zoom) = containerWidth / 2
    // pan.x = (containerWidth / 2) - (bounds.centerX * zoom)
    
    // However, our DiagramCanvas applies transform origin 0 0.
    // transform: translate(pan.x, pan.y) scale(zoom)
    // So coordinate (x,y) becomes (x*zoom + pan.x, y*zoom + pan.y)
    
    // We want content center (bounds.centerX, bounds.centerY) to be at screen center (containerWidth/2, containerHeight/2)
    const panX = (containerWidth / 2) - (bounds.centerX * zoom);
    const panY = (containerHeight / 2) - (bounds.centerY * zoom);

    return {
        zoom,
        pan: { x: panX, y: panY }
    };
};

export const calculateAutoAnchors = (
    sourceNode: CanvasNode,
    targetNode: CanvasNode
): { sourceSide: Side; targetSide: Side } => {
    const dx = targetNode.x - sourceNode.x;
    const dy = targetNode.y - sourceNode.y;

    if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal
        return {
            sourceSide: dx > 0 ? 'right' : 'left',
            targetSide: dx > 0 ? 'left' : 'right'
        };
    } else {
        // Vertical
        return {
            sourceSide: dy > 0 ? 'bottom' : 'top',
            targetSide: dy > 0 ? 'top' : 'bottom'
        };
    }
};
