import React from 'react';
import { LayoutNode } from '../types';

interface ConnectionProps {
    start: LayoutNode;
    end: LayoutNode;
    isCritical: boolean;
}

const NODE_DIAMETER = 180;
const RADIUS = NODE_DIAMETER / 2;

export const Connection: React.FC<ConnectionProps> = ({ start, end, isCritical }) => {
    const startX = start.x + RADIUS;
    const startY = start.y;
    const endX = end.x - RADIUS;
    const endY = end.y;

    const midX = (startX + endX) / 2;
    const pathData = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;

    return (
        <g>
            <path d={pathData} fill="none" stroke="white" strokeWidth={isCritical ? 8 : 5} strokeOpacity={0.8} />
            <path d={pathData} fill="none" stroke={isCritical ? "#f43f5e" : "#94a3b8"} strokeWidth={isCritical ? 4 : 2} className="transition-all duration-300" />
            <path d={`M ${endX} ${endY} L ${endX - 8} ${endY - 4} L ${endX - 8} ${endY + 4} Z`} fill={isCritical ? "#f43f5e" : "#94a3b8"} />
        </g>
    );
};
