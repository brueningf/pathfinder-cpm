import React, { useState } from 'react';
import { Edit2, X, Settings2, Trash2 } from 'lucide-react';
import { Task } from '../types';

interface EditTaskModalProps {
    task: Task;
    onSave: (originalId: string, newId: string, updates: Partial<Task>) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
    allTaskIds: string[];
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({ task, onSave, onDelete, onClose, allTaskIds }) => {
    const [id, setId] = useState(task.id);
    const [name, setName] = useState(task.name);
    const [duration, setDuration] = useState(task.duration);
    const [preds, setPreds] = useState(task.predecessors.join(', '));

    // Overrides
    const [manualSlack, setManualSlack] = useState<string>(task.manualSlack?.toString() || '');
    const [manualCritical, setManualCritical] = useState<string>(task.manualCritical || 'auto');
    const [manualES, setManualES] = useState<string>(task.manualES?.toString() || '');
    const [manualEF, setManualEF] = useState<string>(task.manualEF?.toString() || '');
    const [manualLS, setManualLS] = useState<string>(task.manualLS?.toString() || '');
    const [manualLF, setManualLF] = useState<string>(task.manualLF?.toString() || '');

    // New fields
    const [resources, setResources] = useState<string>(task.resources?.join(', ') || '');
    const [cost, setCost] = useState<string>(task.cost?.toString() || '');

    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const parsedPreds = preds.split(',').map(s => s.trim().toUpperCase()).filter(s => s !== '');

        // Validation
        const trimmedId = id.trim().toUpperCase();
        if (!trimmedId) { setError("ID cannot be empty"); return; }
        if (trimmedId !== task.id && allTaskIds.includes(trimmedId)) { setError("ID already exists"); return; }
        if (parsedPreds.includes(trimmedId)) { setError("Self-dependency detected"); return; }

        onSave(task.id, trimmedId, { // Pass original ID and new ID
            name,
            duration: parseInt(duration.toString()) || 0, // Ensure duration is parsed as int
            predecessors: parsedPreds,
            resources: resources.split(',').map(s => s.trim()).filter(s => s),
            cost: parseFloat(cost) || 0,
            manualSlack: manualSlack === '' ? undefined : parseFloat(manualSlack as string),
            manualCritical: manualCritical as 'auto' | 'true' | 'false',
            manualES: manualES === '' ? undefined : parseFloat(manualES as string),
            manualEF: manualEF === '' ? undefined : parseFloat(manualEF as string),
            manualLS: manualLS === '' ? undefined : parseFloat(manualLS as string),
            manualLF: manualLF === '' ? undefined : parseFloat(manualLF as string)
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Edit2 size={18} /> Edit Task
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-4 gap-4">
                        {/* ID Field */}
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">ID</label>
                            <input
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono uppercase font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                                value={id}
                                onChange={e => setId(e.target.value)}
                            />
                        </div>
                        <div className="col-span-3">
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Name</label>
                            <input className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Duration</label>
                            <input type="number" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={duration} onChange={e => setDuration(Number(e.target.value))} />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Preds (IDs)</label>
                            <input className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono uppercase" value={preds} onChange={e => setPreds(e.target.value)} />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                            <Settings2 size={12} /> Metric Overrides
                        </label>
                        <div className="grid grid-cols-4 gap-2 mb-4">
                            {/* Manual Dates */}
                            <div>
                                <span className="text-[9px] text-slate-400 block mb-1 uppercase">ES</span>
                                <input type="number" placeholder="Auto" className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-center" value={manualES} onChange={e => setManualES(e.target.value)} />
                            </div>
                            <div>
                                <span className="text-[9px] text-slate-400 block mb-1 uppercase">EF</span>
                                <input type="number" placeholder="Auto" className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-center" value={manualEF} onChange={e => setManualEF(e.target.value)} />
                            </div>
                            <div>
                                <span className="text-[9px] text-slate-400 block mb-1 uppercase">LS</span>
                                <input type="number" placeholder="Auto" className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-center" value={manualLS} onChange={e => setManualLS(e.target.value)} />
                            </div>
                            <div>
                                <span className="text-[9px] text-slate-400 block mb-1 uppercase">LF</span>
                                <input type="number" placeholder="Auto" className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-center" value={manualLF} onChange={e => setManualLF(e.target.value)} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-[10px] text-slate-400 block mb-1">Force Slack</span>
                                <input type="number" placeholder="Auto" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={manualSlack} onChange={e => setManualSlack(e.target.value)} />
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-400 block mb-1">Critical Status</span>
                                <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={manualCritical} onChange={e => setManualCritical(e.target.value)}>
                                    <option value="auto">Auto</option>
                                    <option value="true">Critical</option>
                                    <option value="false">Normal</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {error && <p className="text-xs text-rose-500">{error}</p>}

                    <div className="flex gap-4 pt-4 mt-2 border-t border-slate-100">
                        {/* Delete Button */}
                        <button
                            type="button"
                            onClick={() => { if (window.confirm('Delete this task?')) onDelete(task.id); }}
                            className="btn bg-rose-50 text-rose-600 hover:bg-rose-100"
                        >
                            <Trash2 size={16} /> <span className="text-xs uppercase">Delete</span>
                        </button>
                        <div className="flex-1 flex gap-2">
                            <button type="button" onClick={onClose} className="btn flex-1 text-slate-600 hover:bg-slate-50">Cancel</button>
                            <button type="submit" className="btn flex-[2] bg-slate-900 text-white hover:bg-slate-800">Save Changes</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};
