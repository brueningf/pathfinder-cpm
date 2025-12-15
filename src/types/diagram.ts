export interface Point {
    x: number;
    y: number;
}

export interface Size {
    width: number;
    height: number;
}

export interface Dimensions {
    width: number;
    height: number;
}

export type Side = 'top' | 'bottom' | 'left' | 'right';

export type LineStyle = 'straight' | 'orthogonal' | 'curved';

// Defines the viewport state
export interface ViewState {
    zoom: number;
    pan: Point;
}

// Represents the bounding box of a diagram
export interface DiagramBounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
}
