import { ChevronLeft, ChevronRight, CheckCircle, Database, GitMerge, ListTree, ArrowRightLeft, CheckSquare } from 'lucide-react';

interface ProcessNavigatorProps {
    currentStep: 1 | 2 | 3 | 4 | 5;
    onStepChange: (step: 1 | 2 | 3 | 4 | 5) => void;
    onBack: () => void;
}

export const ProcessNavigator: React.FC<ProcessNavigatorProps> = ({ currentStep, onStepChange, onBack }) => {
    const steps = [
        { 
            id: 1, 
            label: 'Data Modeling', 
            description: 'Define Entities & Relationships',
            icon: <Database size={18} />
        },
        { 
            id: 2, 
            label: 'Process Decomposition', 
            description: 'Break down business functions',
            icon: <ListTree size={18} />
        },
        { 
            id: 3, 
            label: 'Process Dependency', 
            description: 'Sequence processes',
            icon: <GitMerge size={18} />
        },
        { 
            id: 4, 
            label: 'Process Data Flow', 
            description: 'Map data input/output',
            icon: <ArrowRightLeft size={18} />
        },
        { 
            id: 5, 
            label: 'Validation', 
            description: 'CRUD Matrix Analysis',
            icon: <CheckSquare size={18} />
        },
    ] as const;

    return (
        <div className="h-full w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
            {/* Header - Aligned with editor toolbar */}
            <div className="p-2 flex items-center border-b border-slate-200 bg-white gap-2 shrink-0 h-[53px]">
                <button 
                    onClick={onBack}
                    className="p-2 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                >
                    <ChevronLeft size={20} />
                </button>
                <div className="flex flex-col justify-center">
                    <h2 className="font-bold text-slate-800 text-sm leading-tight">IE Method</h2>
                    <div className="text-[10px] text-slate-500 leading-tight">Information Engineering</div>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {steps.map((step) => {
                    const isActive = currentStep === step.id;
                    const isCompleted = currentStep > step.id;
                    const isClickable = true; 

                    return (
                        <div 
                            key={step.id} 
                            onClick={() => isClickable && onStepChange(step.id as any)}
                            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors border
                                ${isActive ? 'bg-white border-blue-500 shadow-sm ring-1 ring-blue-100' : 
                                  'bg-transparent border-transparent hover:bg-slate-100 text-slate-600'}
                            `}
                        >
                            <div className={`
                                shrink-0 w-8 h-8 rounded-full flex items-center justify-center border mt-0.5
                                ${isActive ? 'bg-blue-600 border-blue-600 text-white' : 
                                  isCompleted ? 'bg-green-50 text-green-600 border-green-200' : 
                                  'bg-white border-slate-300 text-slate-400'}
                            `}>
                                {isCompleted ? <CheckCircle size={16} /> : step.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className={`text-sm font-semibold leading-none mb-1 ${isActive ? 'text-blue-700' : isCompleted ? 'text-slate-700' : 'text-slate-500'}`}>
                                    {step.label}
                                </div>
                                <div className="text-xs text-slate-500 leading-tight">
                                    {step.description}
                                </div>
                            </div>
                            {/* {isActive && <ChevronRight size={16} className="text-blue-500 self-center" />} */}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
