import React from 'react';
import { LayoutNode } from '../types';

interface NodeProps {
    data: LayoutNode;
    isSelected?: boolean;
    onClick?: (e: React.MouseEvent) => void;
    onContextMenu: (e: React.MouseEvent, taskId: string) => void;
    onDoubleClick: (task: LayoutNode) => void;
}

const NODE_DIAMETER = 180;

export const Node: React.FC<NodeProps & { onMouseDown?: (e: React.MouseEvent) => void, theme: 'dark' | 'light' }> = ({ data, isSelected, onClick, onContextMenu, onDoubleClick, onMouseDown, theme }) => {
    const isCritical = data.isCritical;
    const isStart = data.type === 'start';
    const isEnd = data.type === 'end';
    const isDark = theme === 'dark';

    // Dynamic styles based on type
    let shapeClasses = 'rounded-full';
    let sizeStyle = { width: NODE_DIAMETER, height: NODE_DIAMETER };

    // "Plain red borders" requested. 
    // Assuming this applies to standard nodes. 
    // Critical nodes usually have red borders anyway.
    // Start/End might keep their distinct look but simplified?
    // User said: "node to not have shadow or red diffuse color plain red borders"

    let colorClasses = isCritical
        ? `border-[3px] border-red-500 ${isDark ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}` // Removed shadow
        : `border-[3px] ${isDark ? 'bg-slate-900 border-slate-600 text-slate-200' : 'bg-white border-slate-900 text-slate-800'}`; // Changed from red to black (slate-900) as requested

    if (isSelected) {
        colorClasses = `border-[3px] border-blue-500 ${isDark ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}`;
    }

    if (isStart) {
        colorClasses = isDark
            ? 'bg-emerald-950/30 border-[3px] border-emerald-500/50 text-emerald-400'
            : 'bg-emerald-50 border-[3px] border-emerald-500 text-emerald-700'; // Removed shadow
        if (isSelected) {
            colorClasses = `border-[3px] border-blue-500 ${isDark ? 'bg-emerald-950/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`;
        }
    } else if (isEnd) {
        colorClasses = isDark
            ? 'bg-slate-800 border-[3px] border-slate-600 text-slate-200'
            : 'bg-slate-900 border-[3px] border-slate-700 text-white'; // Removed shadow
        if (isSelected) {
            colorClasses = `border-[3px] border-blue-500 ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-900 text-white'}`;
        }
    }

    return (
        <div
            onClick={onClick}
            onContextMenu={(e) => onContextMenu(e, data.id)}
            onDoubleClick={() => onDoubleClick(data)}
            onMouseDown={onMouseDown}
            className={`absolute flex flex-col items-center justify-center transition-all duration-300 group cursor-grab active:cursor-grabbing z-10 ${shapeClasses} ${colorClasses}`}
            style={{
                left: data.x,
                top: data.y,
                ...sizeStyle,
                transform: 'translate(-50%, -50%)',
            }}
        >
            <div className={`absolute top-2 px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${isStart ? (isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-700') :
                isEnd ? (isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-800 text-slate-300') :
                    isCritical ? (isDark ? 'bg-rose-900/30 text-rose-300' : 'bg-rose-100 text-rose-700') :
                        (isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')
                }`}>
                ID: {data.id}
            </div>

            <div className="flex flex-col items-center text-center px-4 w-full">
                <span className={`text-sm font-bold leading-tight mb-1 line-clamp-2 ${isEnd ? (isDark ? 'text-slate-200' : 'text-white') : (isDark ? 'text-slate-200' : 'text-slate-800')}`}>
                    {data.name}
                </span>
                {!isStart && !isEnd && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-md border ${isDark ? 'text-slate-400 bg-slate-800 border-slate-700' : 'text-slate-500 bg-slate-50 border-slate-100'}`}>
                        {data.duration} days
                    </span>
                )}
            </div>

            <div className={`absolute bottom-6 w-[70%] grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] border-t pt-1 mt-1 ${isEnd ? 'border-slate-500 text-slate-400' : (isDark ? 'border-slate-700 text-slate-500' : 'border-slate-100 text-slate-400')}`}>
                <div className="text-center">
                    <span className="block text-[7px] uppercase opacity-50">ES / EF</span>
                    <span className={`font-mono ${isEnd ? 'text-slate-300' : (isDark ? 'text-slate-400' : 'text-slate-600')}`}>
                        {data.manualES ? <span className="text-blue-500 font-bold">{data.es}</span> : data.es}
                        /
                        {data.manualEF ? <span className="text-blue-500 font-bold">{data.ef}</span> : data.ef}
                    </span>
                </div>
                <div className="text-center">
                    <span className="block text-[7px] uppercase opacity-50">Slack</span>
                    <span className={`font-mono font-bold ${data.slack === 0 ? 'text-rose-500' : (isEnd ? 'text-slate-300' : (isDark ? 'text-slate-400' : 'text-slate-600'))}`}>
                        {data.manualSlack !== undefined && data.manualSlack !== null && data.manualSlack !== '' ? (
                            <span className="flex items-center justify-center gap-0.5 text-blue-500">
                                {data.slack}*
                            </span>
                        ) : data.slack}
                    </span>
                </div>
            </div>
        </div>
    );
};
