import { cn } from '@/lib/utils';
import { Item, LayeredItem, VisualItem } from '@/modules/vengin/item/item';
import React, { MouseEventHandler, useState } from 'react';
import { Rnd, RndDragCallback, RndResizeCallback } from "react-rnd";
import { useDirectorCtx } from '../ctx/director-ctx';
import { useGetPositionDelta } from '../hooks';
import { useItemsCtx } from '../ctx/items-ctx';
import { useSelectionContext } from '@/modules/vengin/react/selection-ctx';
import { ItemLayerMenu } from './item-layer-menu';

type ItemLayerRendererProps = {
  className?: string;
}

const ItemLayerRenderer: React.FC<ItemLayerRendererProps> = ({ className }) => {
  const [hoveredItemId, setHoveredItemId] = useState<Item["id"] | undefined>();
  const {setSelectedItemId, selectedItemId, setSelectedItemLayerEl} = useSelectionContext();
  const { updateItem } = useItemsCtx();
  const { canvasEl, containerEl, currentTimestampItems, scale } = useDirectorCtx();


  const posDelta = useGetPositionDelta({ canvasEl: canvasEl!, containerEl: containerEl! });
  const nonAudioLayers = currentTimestampItems.filter(f => f.type !== 'AUDIO');
  if (!posDelta) {
    return null;
  }
  const { dX, dY } = posDelta;

  const handleResize = (item: LayeredItem, sync?: boolean): RndResizeCallback => (e, direction, ref, delta, position) => {
    const pos = {
      x: (position.x - dX / 2) / scale,
      y: (position.y - dY / 2) / scale,
    }
    updateItem({
      ...item,
      width: ref.offsetWidth / scale,
      height: ref.offsetHeight / scale,
      ...pos,
    }, sync);
  };

  const handleDrag = (item: LayeredItem, sync?: boolean): RndDragCallback => (e, d) => {
    updateItem({
      ...item,
      x: (d.x - dX / 2) / scale,
      y: (d.y - dY / 2) / scale,
    }, sync);
  };

  const onMouseDown = (item: Item): MouseEventHandler<HTMLDivElement>  => (e) => {
    setSelectedItemId(item.id);
    setSelectedItemLayerEl(e.target as HTMLDivElement)
    e.stopPropagation();
  }

  const baseHandleClasses = {
    bottomRight: 'bg-white rounded-full shadow-md !h-3 !w-3 mb-1.5 mr-1.5 hover:bg-blue-400 transition-colors',
    bottomLeft: 'bg-white rounded-full shadow-md !h-3 !w-3 mb-1.5 ml-1.5 hover:bg-blue-400 transition-colors',
    topRight: 'bg-white rounded-full shadow-md !h-3 !w-3 mt-1.5 mr-1.5 hover:bg-blue-400 transition-colors',
    topLeft: 'bg-white rounded-full shadow-md !h-3 !w-3 mt-1.5 ml-1.5 hover:bg-blue-400 transition-colors',
    right: '!h-4 !w-1.5 rounded-md !top-[50%] translate-y-[-50%] mr-0.5 bg-white hover:bg-blue-400 transition-colors',
    left: '!h-4 !w-1.5 rounded-md !top-[50%] translate-y-[-50%] ml-0.5 bg-white hover:bg-blue-400 transition-colors',
    top: '!h-1.5 !w-4 rounded-md !left-[50%] translate-x-[-50%] mt-0.5 bg-white hover:bg-blue-400 transition-colors',
    bottom: '!h-1.5 !w-4 rounded-md !left-[50%] translate-x-[-50%] mb-0.5 bg-white hover:bg-blue-400 transition-colors',
  };

  const hiddenHandleClasses = {
    bottomRight: 'invisible',
    bottomLeft: 'invisible',
    topRight: 'invisible',
    topLeft: 'invisible',
    right: 'invisible',
    left: 'invisible',
    top: 'invisible',
    bottom: 'invisible',
  };

  return (<>
    <ItemLayerMenu />
    <div
      onMouseDown={() => setSelectedItemLayerEl(undefined)}
      className={cn("z-10 w-full h-full relative overflow-hidden", className)}
    >
      {nonAudioLayers.map(item => {
        const isActive = selectedItemId === item.id || hoveredItemId === item.id;

        return (
          <div
            key={item.id}
            onMouseDown={onMouseDown(item)}
            onMouseEnter={() => setHoveredItemId(item.id)}
            onMouseLeave={() => setHoveredItemId(undefined)}
          >
            <Rnd
              key={`${item.id}-${dX}-${dY}-${scale}`} // Re-render on dim or scale change
              className={cn('border border-transparent hover:border-blue-200 transition-colors', {
                'z-100 !border-blue-500': selectedItemId === item.id
              })}
              style={{
                zIndex: item.zIndex
              }}
              enableResizing={item.type !== 'TEXT'}
              resizeHandleClasses={isActive ? baseHandleClasses : hiddenHandleClasses}
              default={{
                x: item.x * scale + dX / 2,
                y: item.y * scale + dY / 2,
                width: item.width * scale,
                height: item.height * scale,
              }}
              onMouseDown={() => setSelectedItemId(item.id)}
              lockAspectRatio={item.controlConfig?.lockAspectRatio || false}
              onResize={handleResize(item)}
              onResizeStop={handleResize(item, true)}
              onDrag={handleDrag(item)}
              onDragStop={handleDrag(item, true)}
            />
          </div>
        );
      })}
    </div>
    </>
  );
};

export { ItemLayerRenderer };