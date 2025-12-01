import React, { useMemo } from 'react';
import { Project, Task } from '../types';

interface GanttChartProps {
    project: Project;
    theme: 'dark' | 'light';
}

export const GanttChart: React.FC<GanttChartProps> = ({ project, theme }) => {
    const tasks = project.data;
    const isDark = theme === 'dark';

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
        <div className={`overflow-x-auto rounded-xl shadow-sm border ${isDark ? 'bg-slate-900 border-slate-800 dark-scrollbar' : 'bg-white border-slate-200 light-scrollbar'}`}>
            <div className="min-w-max relative" style={{ width: Math.max(800, (totalDuration + 2) * dayWidth + 200) }}>

                {/* Header (Timeline) */}
                <div className={`flex border-b sticky top-0 z-30 ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'}`} style={{ height: headerHeight }}>
                    <div className={`w-48 flex-shrink-0 border-r p-2 font-bold text-sm flex items-center sticky left-0 z-40 ${isDark ? 'border-slate-800 text-slate-400 bg-slate-900' : 'border-slate-200 text-slate-600 bg-slate-50'}`}>
                        Task Name
                    </div>
                    <div className="flex-1 relative">
                        {Array.from({ length: totalDuration + 2 }).map((_, i) => (
                            <div key={i} className={`absolute border-l h-full flex items-center justify-center text-xs ${isDark ? 'border-slate-800 text-slate-600' : 'border-slate-200 text-slate-400'}`}
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
                        <div key={task.id} className={`flex border-b transition-colors ${isDark ? 'border-slate-800 hover:bg-slate-800/50' : 'border-slate-100 hover:bg-slate-50'}`} style={{ height: rowHeight }}>
                            <div className={`w-48 flex-shrink-0 border-r p-2 flex items-center gap-2 overflow-hidden sticky left-0 z-20 ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                                <span className={`font-mono text-xs px-1 rounded ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-400'}`}>{task.id}</span>
                                <span className={`text-sm truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`} title={task.name}>{task.name}</span>
                            </div>
                            <div className="flex-1 relative">
                                {/* Grid lines */}
                                {Array.from({ length: totalDuration + 2 }).map((_, i) => (
                                    <div key={i} className={`absolute border-l h-full ${isDark ? 'border-slate-800' : 'border-slate-100'}`} style={{ left: i * dayWidth }}></div>
                                ))}

                                {/* Bar */}
                                <div
                                    className={`absolute top-2 h-6 rounded-md shadow-sm border flex items-center px-2 text-xs text-white whitespace-nowrap overflow-hidden
                                        ${isCritical ? (isDark ? 'bg-rose-600 border-rose-700' : 'bg-rose-500 border-rose-600') : (isDark ? 'bg-blue-600 border-blue-700' : 'bg-blue-500 border-blue-600')}
                                    `}
                                    style={{ left: left, width: Math.max(width, 2) }} // Min width for visibility
                                >
                                    {width > 30 && task.duration + 'd'}
                                </div>

                                {/* Resources Label */}
                                {task.resources && task.resources.length > 0 && (
                                    <div className={`absolute top-2 h-6 flex items-center text-xs pl-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`} style={{ left: left + width }}>
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
