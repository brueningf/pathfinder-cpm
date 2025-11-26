import React from 'react';

interface Point {
    x: number;
    y: number;
}

interface ConnectionProps {
    start: Point;
    end: Point;
    isCritical: boolean;
}

export const Connection: React.FC<ConnectionProps> = ({ start, end, isCritical }) => {
    const startX = start.x;
    const startY = start.y;
    const endX = end.x;
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
