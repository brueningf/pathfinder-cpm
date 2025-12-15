import { useState, useCallback } from 'react';

export const useSelection = () => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    const toggleSelection = useCallback((id: string, multi: boolean) => {
        setSelectedIds(prev => {
            if (multi) {
                return prev.includes(id) 
                    ? prev.filter(p => p !== id)
                    : [...prev, id];
            }
            return [id];
        });
    }, []);

    const clearSelection = useCallback(() => setSelectedIds([]), []);

    return { selectedIds, setSelectedIds, toggleSelection, clearSelection };
};

export const useNodeMoving = <T extends { id: string; position: { x: number; y: number } }>(
    items: T[],
    onItemsChange: (items: T[]) => void
) => {
    const handleNodeMove = useCallback((id: string, x: number, y: number) => {
        onItemsChange(items.map(item => 
            item.id === id ? { ...item, position: { x, y } } : item
        ));
    }, [items, onItemsChange]);

    return { handleNodeMove };
};
