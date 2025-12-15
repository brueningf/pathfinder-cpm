import React from 'react';

interface NodePropertiesProps {
    name: string;
    description?: string;
    onNameChange: (val: string) => void;
    onDescriptionChange?: (val: string) => void;
    onDelete?: () => void;
    typeLabel?: string;
    id?: string;
}

export const NodeProperties: React.FC<NodePropertiesProps> = ({
    name,
    description,
    onNameChange,
    onDescriptionChange,
    onDelete,
    typeLabel = 'Props',
    id
}) => {
    return (
        <div className="flex flex-col gap-4">
            <div className="pb-2 border-b">
                <h3 className="font-bold text-sm text-slate-800">{typeLabel}</h3>
                {id && <div className="text-xs text-slate-500 font-mono mt-1" title={id}>{id.slice(0, 8)}...</div>}
            </div>

            <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Name</label>
                <input
                    className="w-full p-2 border rounded text-sm bg-white focus:border-blue-500 outline-none transition-colors"
                    value={name}
                    onChange={e => onNameChange(e.target.value)}
                    placeholder="Name"
                />
            </div>

            {onDescriptionChange && (
                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                    <textarea
                        className="w-full p-2 border rounded text-sm bg-white h-24 resize-none focus:border-blue-500 outline-none transition-colors"
                        value={description || ''}
                        onChange={e => onDescriptionChange(e.target.value)}
                        placeholder="Description..."
                    />
                </div>
            )}

            {onDelete && (
                <div className="mt-auto pt-4 border-t">
                    <button onClick={onDelete} className="w-full py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded text-xs font-medium transition-colors flex items-center justify-center gap-2">
                        <span className="w-4 h-4 rounded-full border border-red-400 flex items-center justify-center text-[10px]">✕</span>
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
};
