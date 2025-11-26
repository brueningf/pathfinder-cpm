import React from 'react';
import { LayoutNode } from '../types';

interface NodeProps {
    data: LayoutNode;
    onContextMenu: (e: React.MouseEvent, taskId: string) => void;
    onDoubleClick: (task: LayoutNode) => void;
}

const NODE_DIAMETER = 180;

export const Node: React.FC<NodeProps> = ({ data, onContextMenu, onDoubleClick }) => {
    const isCritical = data.isCritical;

    return (
        <div
            onContextMenu={(e) => onContextMenu(e, data.id)}
            onDoubleClick={() => onDoubleClick(data)}
            className={`absolute flex flex-col items-center justify-center rounded-full shadow-lg transition-all duration-300 group cursor-pointer hover:scale-105 z-10 ${isCritical
                    ? 'bg-white border-[3px] border-rose-500 shadow-rose-200'
                    : 'bg-white border-2 border-slate-300 hover:border-slate-400'
                }`}
            style={{
                left: data.x,
                top: data.y,
                width: NODE_DIAMETER,
                height: NODE_DIAMETER,
                transform: 'translate(-50%, -50%)',
            }}
        >
            <div className={`absolute top-2 px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${isCritical ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
                }`}>
                ID: {data.id}
            </div>

            <div className="flex flex-col items-center text-center px-4 w-full">
                <span className="text-sm font-bold text-slate-800 leading-tight mb-1 line-clamp-2">
                    {data.name}
                </span>
                <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                    {data.duration} days
                </span>
            </div>

            <div className="absolute bottom-6 w-[70%] grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] text-slate-400 border-t border-slate-100 pt-1 mt-1">
                <div className="text-center">
                    <span className="block text-[7px] uppercase opacity-50">ES / EF</span>
                    <span className="font-mono text-slate-600">
                        {data.manualES ? <span className="text-blue-500 font-bold">{data.es}</span> : data.es}
                        /
                        {data.manualEF ? <span className="text-blue-500 font-bold">{data.ef}</span> : data.ef}
                    </span>
                </div>
                <div className="text-center">
                    <span className="block text-[7px] uppercase opacity-50">Slack</span>
                    <span className={`font-mono font-bold ${data.slack === 0 ? 'text-rose-500' : 'text-slate-600'}`}>
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
