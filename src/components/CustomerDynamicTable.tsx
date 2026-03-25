import React, { useState, useEffect, useRef } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FiSettings } from 'react-icons/fi';
import { useTableSettingsStore } from '../store/useTableSettingsStore';
import { ColumnSetting } from '../lib/api/userSettings';
import { TableSettingsDrawer } from './TableSettingsDrawer';
import { LoadingSpinner } from './ui/LoadingSpinner';

interface Props<T> {
  data: T[];
  baseColumns: ColumnSetting[];
  pageKey: string;
  onRowClick: (id: string) => void;
  renderCell: (columnId: string, row: T) => React.ReactNode;
}

function SortableHeader({ column, onResize }: { column: ColumnSetting, onResize: (id: string, width: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: column.width,
    minWidth: column.width,
    maxWidth: column.width,
    zIndex: isDragging ? 30 : column.id === 'name' ? 10 : 1, // 'name' column is sticky
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = column.width;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(60, startWidth + (moveEvent.clientX - startX));
      onResize(column.id, newWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <th
      ref={setNodeRef}
      style={style}
      className={`relative bg-gray-50 border-b border-gray-200 text-left px-4 py-3 font-medium text-gray-500 truncate select-none ${column.id === 'name' ? 'sticky left-0 bg-gray-50 shadow-[1px_0_0_0_#e5e7eb]' : ''}`}
    >
       <div {...attributes} {...listeners} className="cursor-grab hover:text-indigo-600 flex items-center justify-between">
         <span className="truncate">{column.label}</span>
       </div>
       <div
         onMouseDown={handleResizeMouseDown}
         className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-indigo-400 z-20"
       />
    </th>
  );
}

export function CustomerDynamicTable<T extends { id: string }>({ data, baseColumns, pageKey, onRowClick, renderCell }: Props<T>) {
  const { settings, isLoading, loadSettings, updateSettings, resetSettings } = useTableSettingsStore();
  const [localColumns, setLocalColumns] = useState<ColumnSetting[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadSettings(pageKey);
  }, [pageKey, loadSettings]);

  useEffect(() => {
    if (isLoading) return;
    const userSettings = settings[pageKey];
    if (userSettings && userSettings.columns && userSettings.columns.length > 0) {
      // Merge base with custom (in case new columns are added later to base)
      const userCols = userSettings.columns;
      const userColIds = new Set(userCols.map(c => c.id));
      const missingBaseCols = baseColumns.filter(bc => !userColIds.has(bc.id)).map(bc => ({ ...bc, visible: true, order: 999 })); // append to end
      let maxOrder = Math.max(0, ...userCols.map(c => c.order));
      const newMerged = [...userCols, ...missingBaseCols.map(c => ({...c, order: ++maxOrder}))];
      newMerged.sort((a,b) => a.order - b.order);
      setLocalColumns(newMerged);
    } else {
      setLocalColumns(baseColumns.map((c, idx) => ({ ...c, visible: true, order: idx })));
    }
  }, [settings, isLoading, baseColumns, pageKey]);

  const saveSettingsDebounced = (newCols: ColumnSetting[]) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      updateSettings(pageKey, { columns: newCols });
    }, 500);
  };

  const handleResize = (id: string, newWidth: number) => {
    setLocalColumns(prev => {
      const next = prev.map(c => c.id === id ? { ...c, width: newWidth } : c);
      saveSettingsDebounced(next);
      return next;
    });
  };

  const handleColumnsChange = (newCols: ColumnSetting[]) => {
    setLocalColumns(newCols);
    saveSettingsDebounced(newCols);
  };

  const handleReset = () => {
    const defaultCols = baseColumns.map((c, idx) => ({ ...c, visible: true, order: idx }));
    resetSettings(pageKey, { columns: defaultCols });
  };

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
       const oldIndex = localColumns.findIndex(c => c.id === active.id);
       const newIndex = localColumns.findIndex(c => c.id === over.id);
       const newCols = arrayMove(localColumns, oldIndex, newIndex).map((c, idx) => ({ ...c, order: idx }));
       handleColumnsChange(newCols);
    }
  };

  const visibleColumns = localColumns.filter(c => c.visible).sort((a,b) => a.order - b.order);

  if (isLoading && localColumns.length === 0) {
    return <LoadingSpinner message="테이블 설정 불러오는 중..." />;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col relative w-full">
      <div className="flex justify-end bg-white border-b border-gray-100 px-4 py-2">
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <FiSettings size={16} /> 테이블 설정
        </button>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <table className="min-w-full text-sm table-fixed" style={{ width: visibleColumns.reduce((sum, c) => sum + c.width, 0) }}>
            <thead>
              <tr>
                <SortableContext items={visibleColumns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                  {visibleColumns.map(col => (
                    <SortableHeader key={col.id} column={col} onResize={handleResize} />
                  ))}
                </SortableContext>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick(row.id)}
                  className="border-b border-gray-100 hover:bg-indigo-50/50 cursor-pointer transition-colors"
                >
                  {visibleColumns.map((col) => {
                    const content = renderCell(col.id, row);
                    return (
                      <td
                        key={`${row.id}-${col.id}`}
                        className={`px-4 py-3 truncate ${col.id === 'name' ? 'sticky left-0 bg-white shadow-[1px_0_0_0_#e5e7eb] group-hover:bg-indigo-50/50' : ''}`}
                        style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                        title={typeof content === 'string' ? content : ''}
                      >
                         {content || '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </DndContext>
      </div>

      <TableSettingsDrawer
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        columns={localColumns}
        onColumnsChange={handleColumnsChange}
        onReset={handleReset}
      />
      
      {/* We add basic scrollbar styling via inline style for scoped effect if needed, but Tailwind handles it or index.css */}
    </div>
  );
}
