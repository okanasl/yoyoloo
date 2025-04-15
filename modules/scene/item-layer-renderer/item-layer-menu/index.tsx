import React, { useState, useRef, useEffect } from 'react';
import { usePopper } from 'react-popper';
import { useSelectionContext } from '@/modules/vengin/react/selection-ctx';
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// Icons
import { Settings, Trash2 } from 'lucide-react';
import { useItemsCtx } from '../../ctx/items-ctx';

function ItemLayerMenu() {
    const { selectedItem, selectedItemLayerEl } = useSelectionContext();
    const { deleteItem } = useItemsCtx();

    const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
    const [isSettingsPopoverOpen, setIsSettingsPopoverOpen] = useState(false);
    const [isDeletePopoverOpen, setIsDeletePopoverOpen] = useState(false);

    const { styles, attributes, update } = usePopper(selectedItemLayerEl, popperElement, {
        placement: 'top',
        modifiers: [
            { name: 'offset', options: { offset: [0, 8] } },
            { name: 'preventOverflow', options: { padding: 8 } }
        ],
    });

    useEffect(() => {
        if (!update) {
            return;
        }
        const intervalRef = setInterval(() => {
            update();
        }, 300);

        return () => {
            clearInterval(intervalRef);
        }
    }, [update])

    const handleDeleteConfirm = () => {
        if (selectedItem) {
            deleteItem(selectedItem, true);
        }
        setIsDeletePopoverOpen(false);
    };

    useEffect(() => {
        if (!selectedItemLayerEl) {
            setIsSettingsPopoverOpen(false);
            setIsDeletePopoverOpen(false);
        }
    }, [selectedItemLayerEl]);

    if (!selectedItemLayerEl) {
        return null;
    }

    return (
        <div
            ref={setPopperElement}
            style={styles.popper}
            {...attributes.popper}
            className="z-50 flex items-center gap-1 p-1 rounded-md border bg-background shadow-md h-auto"
        >
            <Popover open={isSettingsPopoverOpen} onOpenChange={setIsSettingsPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="px-2" aria-label="Open Settings">
                        <Settings className="h-4 w-4" />
                        <span className="sr-only">Settings</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-64"
                    sideOffset={5}
                    align="start"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    onEscapeKeyDown={() => setIsSettingsPopoverOpen(false)}
                >
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <h4 className="font-medium leading-none">Layer Settings</h4>
                            <p className="text-sm text-muted-foreground">
                                Adjust properties for "{selectedItem?.name || 'the selected item'}".
                            </p>
                        </div>
                        <div className="grid gap-2">
                            <div className="grid grid-cols-3 items-center gap-4">
                                <Label htmlFor="layer-name">Name</Label>
                                <Input id="layer-name" defaultValue={selectedItem?.name || ''} className="col-span-2 h-8" />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-4">
                                <Label htmlFor="layer-opacity">Opacity</Label>
                                <Input id="layer-opacity" type="number" defaultValue="100" className="col-span-2 h-8" />
                            </div>
                        </div>
                         <Button size="sm" onClick={() => setIsSettingsPopoverOpen(false)}>
                            Apply & Close
                         </Button>
                    </div>
                </PopoverContent>
            </Popover>

            <Popover open={isDeletePopoverOpen} onOpenChange={setIsDeletePopoverOpen}>
                <PopoverTrigger asChild>
                     <Button
                        variant="ghost"
                        size="sm"
                        className="px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Delete Item"
                     >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                     </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-auto max-w-xs p-4"
                    sideOffset={5}
                    align="start"
                    onEscapeKeyDown={() => setIsDeletePopoverOpen(false)}
                >
                    <div className="grid gap-4">
                        <div className="space-y-1">
                            <h4 className="font-medium leading-none">Confirm Deletion</h4>
                            <p className="text-sm text-muted-foreground">
                                Are you sure you want to delete "{selectedItem?.name || 'this item'}"?
                            </p>
                            <p className="text-xs text-destructive/80">
                                This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsDeletePopoverOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleDeleteConfirm}
                            >
                                Delete
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}

export { ItemLayerMenu };