

"use client"

import { createContext, Dispatch, ReactNode, SetStateAction, useContext, useState } from 'react';
import { Item } from '@/modules/vengin/item/item';
import { useProjectDetails } from '@/modules/projects/ctx/project-details-ctx';

type ItemsCtxType = {
    items: Item[];
    setItems: Dispatch<SetStateAction<Item[]>>
    updateItem: (item: Item, sync?: boolean) => void;
    deleteItem: (item: Item, sync?: boolean) => void;
    updateItems: (newValues: Item[]) => void;
    syncItems: () => void;
}
// Create the context
const ItemsCtxContext = createContext<ItemsCtxType | undefined>({
    items: [],
    setItems: () => {},
    updateItem: () => {
        throw new Error("Not implemented");
    },
    updateItems: () => {
        throw new Error("Not implemented");
    },
    deleteItem: () => {
        throw new Error("Not implemented");
    },
    syncItems: () => {
        throw new Error("Not implemented");
    },
});
// Create the provider component
export function ItemsCtxProvider({ children }: {children: ReactNode}) {
    const [items, setItems] = useState<Item[]>([]);
    const {project, updateProject} = useProjectDetails();

    const updateItems = (newValues: Item[]) => {
        setItems(newValues);
    }

    /**
     * Updates item
     * @param item Item to be updated
     * @param sync Whether or not we should update backend state
     */
    const updateItem = (item: Item, sync?: boolean) => {
        const ch = items.map((itm) => {
            if (item.id === itm.id) {
                return item
            }
            return itm
        })
        setItems(ch)
        if (sync && project) {
            updateProject({
                ...project,
                state: {
                    items: ch
                } as any
            })
        }
    }

    /**
     * Updates item
     * @param item Item to be updated
     * @param sync Whether or not we should update backend state
     */
    const deleteItem = (item: Item, sync?: boolean) => {
        const ch = items.filter((itm) => itm.id !== item.id);
        setItems(ch)
        if (sync && project) {
            updateProject({
                ...project,
                state: {
                    items: ch
                } as any
            })
        }
    }

    const syncItems = () => {
        if (project) {
            updateProject({
                ...project,
                state: {
                    items
                } as any
            })
        }
    }
    

    // Value object that will be provided to consumers
    const value: ItemsCtxType = {
        items,
        setItems,
        updateItem,
        updateItems,
        deleteItem,
        syncItems,
    };

    return (
        <ItemsCtxContext.Provider value={value}>
            {children}
        </ItemsCtxContext.Provider>
    );
}

// Custom hook to use the ItemsCtx context
export function useItemsCtx() {
    const context = useContext(ItemsCtxContext);
    if (context === undefined) {
        throw new Error('useItemsCtx must be used within a ItemsCtxProvider');
    }
    return context;
}