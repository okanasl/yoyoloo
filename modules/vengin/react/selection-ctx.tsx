import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { Item } from '../item/item';
import { useItemsCtx } from '@/modules/scene/ctx/items-ctx';


type SelectionContextValue = {
    selectedItem: Item | undefined;
    selectedItemId: Item["id"] | undefined;
    setSelectedItemId: React.Dispatch<React.SetStateAction<Item["id"] | undefined>>;
    selectedItemLayerEl: HTMLDivElement | undefined;
    setSelectedItemLayerEl: React.Dispatch<React.SetStateAction<HTMLDivElement | undefined>>
}

const defaultContextValue: SelectionContextValue = {
    selectedItem: undefined,
    selectedItemId: undefined,
    setSelectedItemId: () => {
        throw new Error("Not implemented");
    },
    selectedItemLayerEl: undefined,
    setSelectedItemLayerEl: () => {
        throw new Error("Not implemented");
    }
};

const SelectionContext = createContext<SelectionContextValue>(defaultContextValue);

export const SelectionContextProvider = ({ children }: {children: ReactNode}) => {
  const {items} = useItemsCtx();

  const [selectedItemId, setSelectedItemId] = useState<Item["id"] | undefined>(undefined)
  
  const [selectedItemLayerEl, setSelectedItemLayerEl] = useState<HTMLDivElement | undefined>();

  const selectedItem = useMemo(() => {
    return items.find(f => f.id === selectedItemId)
  }, [items, selectedItemId])

  const value: SelectionContextValue = { 
    selectedItem,
    selectedItemId,
    setSelectedItemId,
    selectedItemLayerEl,
    setSelectedItemLayerEl,
};

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
};

// Custom hook to use the font context
export const useSelectionContext = (): SelectionContextValue => {
  const context = useContext(SelectionContext);
  if (context === undefined) {
    throw new Error('useSelectionContext must be used within a SelectionContextProvider');
  }
  return context;
};