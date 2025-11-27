import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, AlertCircle, HelpCircle } from 'lucide-react';
import { Requirement } from '../types';
import { HelpModal } from './HelpModal';

interface RequirementsProps {
    requirements: Requirement[];
    onUpdate: (reqs: Requirement[]) => void;
}

export const Requirements: React.FC<RequirementsProps & { theme: 'dark' | 'light' }> = ({ requirements, onUpdate, theme }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newPriority, setNewPriority] = useState<Requirement['priority']>('Must');
    const [newType, setNewType] = useState<Requirement['type']>('Functional');

    const [helpOpen, setHelpOpen] = useState(false);
    const [helpTitle, setHelpTitle] = useState('');
    const [helpContent, setHelpContent] = useState<React.ReactNode>(null);

    const isDark = theme === 'dark';

    const openHelp = (title: string, content: React.ReactNode) => {
        setHelpTitle(title);
        setHelpContent(content);
        setHelpOpen(true);
    };

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;

        const newReq: Requirement = {
            id: crypto.randomUUID(),
            title: newTitle,
            description: newDesc,
            priority: newPriority,
            type: newType
        };

        onUpdate([...requirements, newReq]);
        setNewTitle('');
        setNewDesc('');
        setIsAdding(false);
    };

    const handleDelete = (id: string) => {
        onUpdate(requirements.filter(r => r.id !== id));
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

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className={`text-2xl font-bold flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-stone-800'}`}>
                        Requirements Engineering
                        <button onClick={() => openHelp('Requirements Engineering', <p>Requirements Engineering is the process of defining, documenting, and maintaining requirements. It involves understanding what the stakeholders need and documenting it in a way that developers can understand.</p>)} className={`transition-colors ${isDark ? 'text-slate-500 hover:text-blue-400' : 'text-slate-400 hover:text-blue-500'}`}><HelpCircle size={18} /></button>
                    </h2>
                    <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Define and prioritize project requirements</p>
                </div>
                <button onClick={() => setIsAdding(!isAdding)} className={`btn text-white ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-900 hover:bg-slate-800'}`}>
                    <Plus size={18} /> Add Requirement
                </button>
            </div>

            {isAdding && (
                <div className={`p-6 rounded-xl shadow-sm border mb-6 animate-in fade-in slide-in-from-top-4 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200'}`}>
                    <h3 className={`font-bold mb-4 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>New Requirement</h3>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div>
                            <label className={`block text-xs font-bold uppercase mb-1 flex items-center gap-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                Title
                                <button type="button" onClick={() => openHelp('Requirement Title', <p>A short, concise name for the requirement. Example: "User Login", "Export to PDF".</p>)} className={`${isDark ? 'text-slate-600 hover:text-blue-400' : 'text-slate-300 hover:text-blue-500'}`}><HelpCircle size={12} /></button>
                            </label>
                            <input autoFocus type="text" className={`w-full px-3 py-2 border rounded-lg ${isDark ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-stone-800'}`} placeholder="e.g., User Login" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                        </div>
                        <div>
                            <label className={`block text-xs font-bold uppercase mb-1 flex items-center gap-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                User Story / Description
                                <button type="button" onClick={() => openHelp('User Story', <div className="space-y-2"><p>A description of the feature from the user's perspective.</p><p className="font-mono text-xs bg-slate-100 p-2 rounded">As a [role], I want [feature] so that [benefit].</p></div>)} className={`${isDark ? 'text-slate-600 hover:text-blue-400' : 'text-slate-300 hover:text-blue-500'}`}><HelpCircle size={12} /></button>
                            </label>
                            <textarea className={`w-full px-3 py-2 border rounded-lg h-24 ${isDark ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-stone-800'}`} placeholder="As a [role], I want [feature] so that [benefit]..." value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className={`block text-xs font-bold uppercase mb-1 flex items-center gap-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    Priority (MoSCoW)
                                    <button type="button" onClick={() => openHelp('MoSCoW Prioritization', <ul className="list-disc pl-4 space-y-1"><li><strong>Must Have:</strong> Critical for delivery.</li><li><strong>Should Have:</strong> Important but not vital.</li><li><strong>Could Have:</strong> Desirable but not necessary.</li><li><strong>Won't Have:</strong> Agreed not to have this time.</li></ul>)} className={`${isDark ? 'text-slate-600 hover:text-blue-400' : 'text-slate-300 hover:text-blue-500'}`}><HelpCircle size={12} /></button>
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
                                    <button type="button" onClick={() => openHelp('Requirement Type', <ul className="list-disc pl-4 space-y-1"><li><strong>Functional:</strong> What the system should do (features).</li><li><strong>Non-Functional:</strong> How the system should behave (performance, security, usability).</li></ul>)} className={`${isDark ? 'text-slate-600 hover:text-blue-400' : 'text-slate-300 hover:text-blue-500'}`}><HelpCircle size={12} /></button>
                                </label>
                                <select className={`w-full px-3 py-2 border rounded-lg ${isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-stone-800'}`} value={newType} onChange={e => setNewType(e.target.value as any)}>
                                    <option value="Functional">Functional</option>
                                    <option value="Non-Functional">Non-Functional</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setIsAdding(false)} className={`btn ${isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}>Cancel</button>
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
                {requirements.map(req => (
                    <div key={req.id} className={`p-4 rounded-xl shadow-sm border flex justify-between items-start group transition-colors ${isDark ? 'bg-slate-900 border-slate-800 hover:border-blue-800' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h3 className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{req.title}</h3>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${priorityColors[req.priority]}`}>{req.priority}</span>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{req.type}</span>
                            </div>
                            <p className={`text-sm whitespace-pre-wrap ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{req.description}</p>
                        </div>
                        <button onClick={() => handleDelete(req.id)} className={`p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${isDark ? 'text-slate-600 hover:text-rose-400 hover:bg-rose-900/20' : 'text-slate-300 hover:text-rose-500 hover:bg-rose-50'}`}>
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
