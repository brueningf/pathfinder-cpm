import React, { useMemo } from 'react';
import { Project, Task } from '../types';

interface GanttChartProps {
    project: Project;
}

export const GanttChart: React.FC<GanttChartProps> = ({ project }) => {
    const tasks = project.data;

    // Calculate total duration if not present (fallback)
    const totalDuration = useMemo(() => {
        let max = 0;
        tasks.forEach(t => {
            if (t.ef && t.ef > max) max = t.ef;
        });
        return max > 0 ? max : 20; // Default width if no calc
    }, [tasks]);

    const sortedTasks = useMemo(() => {
        // Sort by Early Start, then ID
        return [...tasks].sort((a, b) => (a.es || 0) - (b.es || 0) || a.id.localeCompare(b.id));
    }, [tasks]);

    const dayWidth = 40; // Pixels per day
    const headerHeight = 40;
    const rowHeight = 40;

    return (
        <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="min-w-max relative" style={{ width: Math.max(800, (totalDuration + 2) * dayWidth + 200) }}>

                {/* Header (Timeline) */}
                <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-10" style={{ height: headerHeight }}>
                    <div className="w-48 flex-shrink-0 border-r border-slate-200 p-2 font-bold text-slate-600 text-sm flex items-center">
                        Task Name
                    </div>
                    <div className="flex-1 relative">
                        {Array.from({ length: totalDuration + 2 }).map((_, i) => (
                            <div key={i} className="absolute border-l border-slate-200 h-full flex items-center justify-center text-xs text-slate-400"
                                style={{ left: i * dayWidth, width: dayWidth }}>
                                {i}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Rows */}
                {sortedTasks.map(task => {
                    if (task.type === 'start' || task.type === 'end') return null; // Skip start/end nodes for now or show differently

                    const start = task.es || 0;
                    const duration = task.duration;
                    const width = duration * dayWidth;
                    const left = start * dayWidth;
                    const isCritical = task.isCritical;

                    return (
                        <div key={task.id} className="flex border-b border-slate-100 hover:bg-slate-50 transition-colors" style={{ height: rowHeight }}>
                            <div className="w-48 flex-shrink-0 border-r border-slate-200 p-2 flex items-center gap-2 overflow-hidden">
                                <span className="font-mono text-xs text-slate-400 bg-slate-100 px-1 rounded">{task.id}</span>
                                <span className="text-sm text-slate-700 truncate" title={task.name}>{task.name}</span>
                            </div>
                            <div className="flex-1 relative">
                                {/* Grid lines */}
                                {Array.from({ length: totalDuration + 2 }).map((_, i) => (
                                    <div key={i} className="absolute border-l border-slate-100 h-full" style={{ left: i * dayWidth }}></div>
                                ))}

                                {/* Bar */}
                                <div
                                    className={`absolute top-2 h-6 rounded-md shadow-sm border flex items-center px-2 text-xs text-white whitespace-nowrap overflow-hidden
                                        ${isCritical ? 'bg-rose-500 border-rose-600' : 'bg-blue-500 border-blue-600'}
                                    `}
                                    style={{ left: left, width: Math.max(width, 2) }} // Min width for visibility
                                >
                                    {width > 30 && task.duration + 'd'}
                                </div>

                                {/* Resources Label */}
                                {task.resources && task.resources.length > 0 && (
                                    <div className="absolute top-2 h-6 flex items-center text-xs text-slate-500 pl-2" style={{ left: left + width }}>
                                        {task.resources.join(', ')}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
