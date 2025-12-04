import React, { useState, useRef } from 'react';
import { Plus, Trash2, AlertCircle, HelpCircle, Edit2, GripVertical, FileDown } from 'lucide-react';
import { Requirement } from '../types';
import { HelpModal } from './HelpModal';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { jsPDF } from 'jspdf';
import { toJpeg } from 'html-to-image';
import { escapeHtml } from '../utils/security';

interface RequirementsProps {
    requirements: Requirement[];
    onUpdate: (reqs: Requirement[]) => void;
    theme: 'dark' | 'light';
}

const SortableRequirementItem = ({ req, isDark, priorityColors, onDelete, onEdit }: any) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: req.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className={`p-4 rounded-xl shadow-sm border flex justify-between items-start group transition-colors ${isDark ? 'bg-slate-900 border-slate-800 hover:border-blue-800' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
            <div className="flex items-start gap-3 flex-1">
                <button {...attributes} {...listeners} className={`mt-1 cursor-grab active:cursor-grabbing ${isDark ? 'text-slate-600 hover:text-slate-400' : 'text-slate-300 hover:text-slate-500'}`}>
                    <GripVertical size={16} />
                </button>
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h3 className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{req.title}</h3>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${priorityColors[req.priority]}`}>{req.priority}</span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{req.type}</span>
                    </div>
                    <p className={`text-sm whitespace-pre-wrap ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{req.description}</p>
                </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onEdit(req)} className={`p-2 rounded-lg transition-all ${isDark ? 'text-slate-600 hover:text-blue-400 hover:bg-blue-900/20' : 'text-slate-300 hover:text-blue-500 hover:bg-blue-50'}`}>
                    <Edit2 size={18} />
                </button>
                <button onClick={() => onDelete(req.id)} className={`p-2 rounded-lg transition-all ${isDark ? 'text-slate-600 hover:text-rose-400 hover:bg-rose-900/20' : 'text-slate-300 hover:text-rose-500 hover:bg-rose-50'}`}>
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    );
};

export const Requirements: React.FC<RequirementsProps> = ({ requirements, onUpdate, theme }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newPriority, setNewPriority] = useState<Requirement['priority']>('Must');
    const [newType, setNewType] = useState<Requirement['type']>('Functional');

    const [helpOpen, setHelpOpen] = useState(false);
    const [helpTitle, setHelpTitle] = useState('');
    const [helpContent, setHelpContent] = useState<React.ReactNode>(null);

    const isDark = theme === 'dark';

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const openHelp = (title: string, content: React.ReactNode) => {
        setHelpTitle(title);
        setHelpContent(content);
        setHelpOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;

        if (editingId) {
            const updatedReqs = requirements.map(r =>
                r.id === editingId
                    ? { ...r, title: newTitle, description: newDesc, priority: newPriority, type: newType }
                    : r
            );
            onUpdate(updatedReqs);
        } else {
            const newReq: Requirement = {
                id: crypto.randomUUID(),
                title: newTitle,
                description: newDesc,
                priority: newPriority,
                type: newType,
                status: 'Draft'
            };
            onUpdate([...requirements, newReq]);
        }

        setNewTitle('');
        setNewDesc('');
        setEditingId(null);
        setIsAdding(false);
    };

    const handleEdit = (req: Requirement) => {
        setNewTitle(req.title);
        setNewDesc(req.description);
        setNewPriority(req.priority);
        setNewType(req.type);
        setEditingId(req.id);
        setIsAdding(true);
    };

    const handleDelete = (id: string) => {
        onUpdate(requirements.filter(r => r.id !== id));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            const oldIndex = requirements.findIndex((r) => r.id === active.id);
            const newIndex = requirements.findIndex((r) => r.id === over?.id);
            onUpdate(arrayMove(requirements, oldIndex, newIndex));
        }
    };

    const handleExportPDF = async () => {
        // Create a container for the export
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '-10000px'; // Off-screen but rendered
        container.style.left = '0';
        container.style.zIndex = '9999';



        // Create the actual document element
        const element = document.createElement('div');
        element.style.width = '800px';
        element.style.padding = '40px';
        element.style.backgroundColor = '#ffffff';
        element.style.color = '#000000';
        element.style.fontFamily = 'Courier New, Courier, monospace';
        element.style.boxSizing = 'border-box';
        element.style.borderLeft = '1px solid #000';
        element.style.borderRight = '1px solid #000';

        const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        element.innerHTML = `
            <div style="display: flex; flex-direction: column; min-height: 900px; position: relative;">
                <div style="margin-bottom: 40px; border-bottom: 2px solid #000; padding-bottom: 20px;">
                    <h1 style="font-size: 24px; font-weight: bold; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Project Requirements</h1>
                    <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 12px; text-transform: uppercase;">
                        <span>Pathfinder CPM</span>
                        <span>${dateStr}</span>
                    </div>
                </div>

                <div style="flex: 1;">
                    ${requirements.length > 0 ? requirements.map((req, index) => `
                        <div style="margin-bottom: 20px; page-break-inside: avoid; border-bottom: 1px solid #ccc; padding-bottom: 20px;">
                            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
                                <div style="display: flex; align-items: baseline; gap: 12px;">
                                    <span style="font-weight: bold; font-size: 14px;">#${index + 1}</span>
                                    <h3 style="font-size: 16px; font-weight: bold; margin: 0;">${escapeHtml(req.title)}</h3>
                                </div>
                                <div style="display: flex; gap: 8px; font-size: 10px; text-transform: uppercase; font-weight: bold;">
                                    <span style="border: 1px solid #000; padding: 2px 6px;">${req.priority}</span>
                                    <span style="border: 1px solid #000; padding: 2px 6px;">${req.type}</span>
                                </div>
                            </div>
                            <p style="font-size: 12px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${escapeHtml(req.description || 'No description provided.')}</p>
                        </div>
                    `).join('') : '<p style="text-align: center; padding: 40px; font-style: italic;">No requirements defined.</p>'}
                </div>

                <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #000; text-align: center; font-size: 10px; text-transform: uppercase;">
                    Generated by Pathfinder CPM
                </div>
            </div>
        `;

        container.appendChild(element);
        document.body.appendChild(container);

        try {
            const dataUrl = await toJpeg(element, {
                quality: 0.8,
                backgroundColor: '#ffffff',
                pixelRatio: 1.5,
            });

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [800, element.offsetHeight]
            });

            pdf.addImage(dataUrl, 'JPEG', 0, 0, 800, element.offsetHeight);
            pdf.save('requirements.pdf');
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            document.body.removeChild(container);
        }
    };

    const priorityColors = {
        'Must': isDark ? 'bg-rose-900/30 text-rose-300 border-rose-800' : 'bg-rose-100 text-rose-700 border-rose-200',
        'Should': isDark ? 'bg-amber-900/30 text-amber-300 border-amber-800' : 'bg-amber-100 text-amber-700 border-amber-200',
        'Could': isDark ? 'bg-blue-900/30 text-blue-300 border-blue-800' : 'bg-blue-100 text-blue-700 border-blue-200',
        'Won\'t': isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <HelpModal
                isOpen={helpOpen}
                onClose={() => setHelpOpen(false)}
                title={helpTitle}
                content={helpContent}
            />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className={`text-2xl font-bold flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-stone-800'}`}>
                        Requirements Engineering
                        <button onClick={() => openHelp('Requirements Engineering', <p>Requirements Engineering is the process of defining, documenting, and maintaining requirements.</p>)} className={`transition-colors ${isDark ? 'text-slate-500 hover:text-blue-400' : 'text-slate-400 hover:text-blue-500'}`}><HelpCircle size={18} /></button>
                    </h2>
                    <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Define and prioritize project requirements</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleExportPDF} className={`btn ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-white hover:bg-stone-50 text-stone-700 border border-stone-200'}`}>
                        <FileDown size={18} /> Export PDF
                    </button>
                    <button onClick={() => { setIsAdding(!isAdding); setEditingId(null); setNewTitle(''); setNewDesc(''); }} className={`btn text-white ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-900 hover:bg-slate-800'}`}>
                        <Plus size={18} /> {isAdding ? 'Cancel' : 'Add Requirement'}
                    </button>
                </div>
            </div>

            {isAdding && (
                <div className={`p-6 rounded-xl shadow-sm border mb-6 animate-in fade-in slide-in-from-top-4 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200'}`}>
                    <h3 className={`font-bold mb-4 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{editingId ? 'Edit Requirement' : 'New Requirement'}</h3>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label className={`block text-xs font-bold uppercase mb-1 flex items-center gap-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                Title
                                <button type="button" onClick={() => openHelp('Requirement Title', <p>A short, concise name for the requirement.</p>)} className={`${isDark ? 'text-slate-600 hover:text-blue-400' : 'text-slate-300 hover:text-blue-500'}`}><HelpCircle size={12} /></button>
                            </label>
                            <input autoFocus type="text" className={`w-full px-3 py-2 border rounded-lg ${isDark ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-stone-800'}`} placeholder="e.g., User Login" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                        </div>
                        <div>
                            <label className={`block text-xs font-bold uppercase mb-1 flex items-center gap-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                User Story / Description
                                <button type="button" onClick={() => openHelp('User Story', <div className="space-y-2"><p>A description of the feature from the user's perspective.</p></div>)} className={`${isDark ? 'text-slate-600 hover:text-blue-400' : 'text-slate-300 hover:text-blue-500'}`}><HelpCircle size={12} /></button>
                            </label>
                            <textarea className={`w-full px-3 py-2 border rounded-lg h-24 ${isDark ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-stone-800'}`} placeholder="As a [role], I want [feature] so that [benefit]..." value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                        </div>
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <label className={`block text-xs font-bold uppercase mb-1 flex items-center gap-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    Priority (MoSCoW)
                                </label>
                                <select className={`w-full px-3 py-2 border rounded-lg ${isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-stone-800'}`} value={newPriority} onChange={e => setNewPriority(e.target.value as any)}>
                                    <option value="Must">Must Have</option>
                                    <option value="Should">Should Have</option>
                                    <option value="Could">Could Have</option>
                                    <option value="Won't">Won't Have</option>
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className={`block text-xs font-bold uppercase mb-1 flex items-center gap-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    Type
                                </label>
                                <select className={`w-full px-3 py-2 border rounded-lg ${isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-stone-800'}`} value={newType} onChange={e => setNewType(e.target.value as any)}>
                                    <option value="Functional">Functional</option>
                                    <option value="Non-Functional">Non-Functional</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => { setIsAdding(false); setEditingId(null); }} className={`btn ${isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}>Cancel</button>
                            <button type="submit" disabled={!newTitle} className={`btn text-white disabled:opacity-50 ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-900 hover:bg-slate-800'}`}>Save Requirement</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-3">
                {requirements.length === 0 && !isAdding && (
                    <div className={`text-center py-12 rounded-xl border border-dashed ${isDark ? 'text-slate-500 bg-slate-900/50 border-slate-800' : 'text-slate-400 bg-slate-50 border-slate-200'}`}>
                        <AlertCircle size={48} className="mx-auto mb-2 opacity-50" />
                        <p>No requirements defined yet.</p>
                    </div>
                )}

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={requirements.map(r => r.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {requirements.map(req => (
                            <SortableRequirementItem
                                key={req.id}
                                req={req}
                                isDark={isDark}
                                priorityColors={priorityColors}
                                onDelete={handleDelete}
                                onEdit={handleEdit}
                            />
                        ))}
                    </SortableContext>
                </DndContext>
            </div>
        </div>
    );
};
