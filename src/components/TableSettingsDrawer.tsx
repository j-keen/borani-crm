
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FiX, FiAlignJustify, FiEye, FiEyeOff, FiRotateCcw } from 'react-icons/fi';
import { ColumnSetting } from '../lib/api/userSettings';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnSetting[];
  onColumnsChange: (cols: ColumnSetting[]) => void;
  onReset: () => void;
}

function SortableItem({ column, toggleVisibility }: { column: ColumnSetting, toggleVisibility: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: column.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg mb-2 shadow-sm relative z-50">
      <div className="flex items-center gap-3">
        <div {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-indigo-600">
          <FiAlignJustify size={18} />
        </div>
        <span className={`text-sm font-medium ${column.visible ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
          {column.label}
        </span>
      </div>
      <button onClick={() => toggleVisibility(column.id)} className={`p-1.5 rounded-md ${column.visible ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' : 'text-gray-400 bg-gray-50 hover:bg-gray-100'}`}>
        {column.visible ? <FiEye size={16} /> : <FiEyeOff size={16} />}
      </button>
    </div>
  );
}

export function TableSettingsDrawer({ isOpen, onClose, columns, onColumnsChange, onReset }: DrawerProps) {
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  if (!isOpen) return null;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = columns.findIndex(c => c.id === active.id);
      const newIndex = columns.findIndex(c => c.id === over.id);
      const newCols = arrayMove(columns, oldIndex, newIndex).map((c, idx) => ({ ...c, order: idx }));
      onColumnsChange(newCols);
    }
  };

  const toggleVisibility = (id: string) => {
    const newCols = columns.map(c => c.id === id ? { ...c, visible: !c.visible } : c);
    onColumnsChange(newCols);
  };

  const sortedCols = [...columns].sort((a,b) => a.order - b.order);

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 w-80 h-full bg-gray-50 shadow-2xl z-50 flex flex-col transform transition-transform duration-300">
        <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">테이블 설정</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            <FiX size={20} />
          </button>
        </div>
        
        <div className="p-4 bg-white border-b border-gray-200 flex justify-end">
          <button onClick={onReset} className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors">
            <FiRotateCcw size={14} /> 기본값으로 초기화
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 relative">
          <p className="text-xs text-gray-500 mb-4">항목을 꾹 눌러 위아래로 순서를 변경하거나, 눈 아이콘으로 표시 여부를 결정하세요.</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedCols.map(c => c.id)} strategy={verticalListSortingStrategy}>
               {sortedCols.map(col => (
                 <SortableItem key={col.id} column={col} toggleVisibility={toggleVisibility} />
               ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </>
  );
}
