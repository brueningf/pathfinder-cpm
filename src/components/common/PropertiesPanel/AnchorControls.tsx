import React from 'react';

interface AnchorControlsProps {
    label: string;
    sideValue: string | undefined;
    offsetValue: number | undefined;
    onSideChange: (val: string | undefined) => void;
    onOffsetChange: (val: number) => void;
}

export const AnchorControls: React.FC<AnchorControlsProps> = ({
    label,
    sideValue,
    offsetValue,
    onSideChange,
    onOffsetChange
}) => {
    return (
        <div className="border-t pt-2 mt-2">
            <label className="text-xs font-bold uppercase opacity-50 block mb-1">{label} Anchor</label>
            <div className="grid grid-cols-2 gap-2 mb-2">
                <select 
                    className="p-1 border rounded text-xs"
                    value={sideValue || ''}
                    onChange={(e) => onSideChange(e.target.value || undefined)}
                >
                    <option value="">Auto</option>
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                </select>
                {(sideValue) && (
                    <input 
                        type="range" min="0" max="1" step="0.05"
                        className="w-full"
                        value={offsetValue ?? 0.5}
                        onChange={(e) => onOffsetChange(parseFloat(e.target.value))}
                        title={`Offset: ${Math.round((offsetValue ?? 0.5) * 100)}%`}
                    />
                )}
            </div>
        </div>
    );
};
