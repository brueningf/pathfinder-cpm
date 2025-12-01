import React from 'react';
import { LayoutNode } from '../types';
import { X, AlertTriangle, Clock, Calendar, Activity } from 'lucide-react';

interface NodeDetailsPanelProps {
    node: LayoutNode;
    onEdit: () => void;
    onDelete: () => void;
    onClose: () => void;
    theme: 'dark' | 'light';
}

export const NodeDetailsPanel: React.FC<NodeDetailsPanelProps> = ({ node, onEdit, onDelete, onClose, theme }) => {
    const isDark = theme === 'dark';

    return (
        <div className={`absolute top-4 right-4 w-80 rounded-xl shadow-2xl border backdrop-blur-md z-40 flex flex-col transition-all duration-300 ${isDark ? 'bg-slate-900/90 border-slate-700 text-slate-200' : 'bg-white/90 border-stone-200 text-stone-800'}`}>
            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-slate-700' : 'border-stone-100'}`}>
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${node.isCritical ? 'bg-red-500 text-white' : (isDark ? 'bg-slate-800 text-slate-400' : 'bg-stone-100 text-stone-600')}`}>
                        {node.id}
                    </div>
                    <div>
                        <h3 className="font-bold text-sm leading-tight line-clamp-1">{node.name}</h3>
                        <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-slate-500' : 'text-stone-400'}`}>
                            {node.type === 'start' ? 'Start Node' : node.type === 'end' ? 'End Node' : 'Task Node'}
                        </span>
                    </div>
                </div>
                <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-stone-100 text-stone-400'}`}>
                    <X size={16} />
                </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                {/* Critical Path Indicator */}
                {node.isCritical && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold ${isDark ? 'bg-red-900/20 text-red-400 border border-red-900/30' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                        <AlertTriangle size={14} />
                        Critical Path Item
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-stone-50/50 border-stone-100'}`}>
                        <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase mb-1 ${isDark ? 'text-slate-500' : 'text-stone-400'}`}>
                            <Clock size={12} /> Duration
                        </div>
                        <div className="text-lg font-bold">{node.duration} <span className="text-xs font-normal opacity-60">days</span></div>
                    </div>
                    <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-stone-50/50 border-stone-100'}`}>
                        <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase mb-1 ${isDark ? 'text-slate-500' : 'text-stone-400'}`}>
                            <Activity size={12} /> Slack
                        </div>
                        <div className={`text-lg font-bold ${node.slack === 0 ? 'text-red-500' : 'text-emerald-500'}`}>{node.slack} <span className={`text-xs font-normal opacity-60 ${isDark ? 'text-slate-400' : 'text-stone-600'}`}>days</span></div>
                    </div>
                </div>

                {/* Timing Details */}
                <div className={`rounded-lg border overflow-hidden ${isDark ? 'border-slate-800' : 'border-stone-100'}`}>
                    <div className={`grid grid-cols-2 divide-x ${isDark ? 'divide-slate-800 bg-slate-950/30' : 'divide-stone-100 bg-stone-50/30'}`}>
                        <div className="p-2 text-center">
                            <span className={`block text-[9px] uppercase font-bold mb-0.5 ${isDark ? 'text-slate-500' : 'text-stone-400'}`}>Earliest Start</span>
                            <span className="font-mono font-bold">{node.es}</span>
                        </div>
                        <div className="p-2 text-center">
                            <span className={`block text-[9px] uppercase font-bold mb-0.5 ${isDark ? 'text-slate-500' : 'text-stone-400'}`}>Earliest Finish</span>
                            <span className="font-mono font-bold">{node.ef}</span>
                        </div>
                        <div className={`p-2 text-center border-t ${isDark ? 'border-slate-800' : 'border-stone-100'}`}>
                            <span className={`block text-[9px] uppercase font-bold mb-0.5 ${isDark ? 'text-slate-500' : 'text-stone-400'}`}>Latest Start</span>
                            <span className="font-mono font-bold">{node.ls === Infinity ? '∞' : node.ls}</span>
                        </div>
                        <div className={`p-2 text-center border-t ${isDark ? 'border-slate-800' : 'border-stone-100'}`}>
                            <span className={`block text-[9px] uppercase font-bold mb-0.5 ${isDark ? 'text-slate-500' : 'text-stone-400'}`}>Latest Finish</span>
                            <span className="font-mono font-bold">{node.lf === Infinity ? '∞' : node.lf}</span>
                        </div>
                    </div>
                </div>
            </div>


        </div>
    );
};
