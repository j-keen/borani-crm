import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableItemProps {
  id: string;
  item: any;
  onEdit: (item: any) => void;
  onToggleActive: (item: any) => void;
  onDelete: (id: string) => void;
  isSub?: boolean;
}

export function SortableItem({ id, item, onEdit, onToggleActive, onDelete, isSub }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 border border-gray-100 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow ${isSub ? 'ml-8 bg-gray-50' : ''}`}
    >
      <div {...attributes} {...listeners} className="cursor-grab p-1 text-gray-400 hover:text-gray-600">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
      </div>
      
      <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: item.color || '#ccc' }} />
      <span className={`flex-1 text-sm ${item.is_active ? 'text-gray-900 font-medium' : 'text-gray-400 line-through'}`}>
        {item.label}
      </span>
      
      <div className="flex items-center gap-2">
        <button onClick={() => onEdit(item)} className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100">수정</button>
        <button
          onClick={() => onToggleActive(item)}
          className={`px-2 py-1 text-xs font-medium rounded ${item.is_active ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-green-600 bg-green-50 hover:bg-green-100'}`}
        >
          {item.is_active ? '비활성화' : '활성화'}
        </button>
        <button onClick={() => onDelete(item.id)} className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100">삭제</button>
      </div>
    </div>
  );
}
