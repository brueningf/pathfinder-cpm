import React from 'react';
import { X, HelpCircle } from 'lucide-react';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    content: React.ReactNode;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, title, content }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <HelpCircle size={20} className="text-blue-500" />
                        {title}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 text-slate-600 text-sm leading-relaxed max-h-[70vh] overflow-y-auto">
                    {content}
                </div>
                <div className="bg-slate-50 border-t border-slate-100 p-4 flex justify-end">
                    <button onClick={onClose} className="btn bg-slate-900 text-white hover:bg-slate-800">
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
};
