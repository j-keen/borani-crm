import { useEffect, useState } from 'react';
import { useStatusStore } from '../../store/useStatusStore';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';

export function StatusManager() {
  const { items, isLoading, fetchItems, addItem, updateItem, deleteItem, updateSortOrder, checkUsage } = useStatusStore();
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState('#6B7280');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const parents = items.filter(i => !i.parent_id).sort((a, b) => a.sort_order - b.sort_order);

  const handleDragEnd = (event: DragEndEvent, parentId: string | null) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const list = items.filter(i => (i.parent_id || null) === parentId).sort((a, b) => a.sort_order - b.sort_order);
      const oldIndex = list.findIndex(i => i.id === active.id);
      const newIndex = list.findIndex(i => i.id === over?.id);
      
      const moved = arrayMove(list, oldIndex, newIndex);
      updateSortOrder(moved.map(i => i.id));
    }
  };

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    await addItem({
      label: newLabel.trim(),
      color: newColor,
      parent_id: selectedParentId,
      is_active: true
    });
    setNewLabel('');
    setNewColor('#6B7280');
  };

  const handleDelete = async (id: string) => {
    const usageCount = await checkUsage(id);
    if (usageCount > 0) {
      const confirmSoft = window.confirm(`이 항목을 사용 중인 데이터가 ${usageCount}건 있습니다.\n해당 항목을 영구 삭제할 수 없으며, 대신 "비활성화(숨김)" 처리하시겠습니까?`);
      if (confirmSoft) {
        await deleteItem(id, true);
      }
    } else {
      if (window.confirm('이 항목을 정말 삭제하시겠습니까? 하위 옵션도 함께 삭제옵니다.')) {
        await deleteItem(id, false);
      }
    }
  };

  if (isLoading && items.length === 0) return <div className="p-4 text-center">로딩 중...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg flex flex-col sm:flex-row gap-3 items-end border border-gray-200">
        <div className="flex-1 w-full">
          <label className="block text-xs font-medium text-gray-500 mb-1">상태/옵션 명</label>
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="상태 및 옵션 이름 입력"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">상위 그룹 (선택)</label>
          <select
            value={selectedParentId || ''}
            onChange={(e) => setSelectedParentId(e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">(최상위 상태 추가)</option>
            {parents.map(p => (
              <option key={p.id} value={p.id}>[{p.label}] 하위 옵션으로 추가</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">색상</label>
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="w-12 h-9 border border-gray-300 rounded-lg cursor-pointer"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={!newLabel.trim()}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          항목 추가
        </button>
      </div>

      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded-lg shadow-xl w-96 space-y-4">
            <h3 className="font-semibold text-lg">항목 수정</h3>
            <input type="text" value={editingItem.label} onChange={e => setEditingItem({...editingItem, label: e.target.value})} className="w-full p-2 border rounded" />
            <input type="color" value={editingItem.color} onChange={e => setEditingItem({...editingItem, color: e.target.value})} className="w-full h-10 border rounded" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingItem(null)} className="px-3 py-1 bg-gray-200 rounded">취소</button>
              <button onClick={() => { updateItem(editingItem.id, { label: editingItem.label, color: editingItem.color }); setEditingItem(null); }} className="px-3 py-1 bg-indigo-600 text-white rounded">저장</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Statuses DND */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, null)}>
        <SortableContext items={parents.map(p => p.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {parents.map(parent => {
              const children = items.filter(i => i.parent_id === parent.id).sort((a,b) => a.sort_order - b.sort_order);
              return (
                <div key={parent.id} className="space-y-2">
                  <SortableItem
                    id={parent.id}
                    item={parent}
                    onEdit={setEditingItem}
                    onToggleActive={(item) => updateItem(item.id, { is_active: !item.is_active })}
                    onDelete={handleDelete}
                  />
                  
                  {/* Children DND */}
                  {children.length > 0 && (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, parent.id)}>
                      <SortableContext items={children.map(c => c.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                          {children.map(child => (
                            <SortableItem
                              key={child.id}
                              id={child.id}
                              item={child}
                              onEdit={setEditingItem}
                              onToggleActive={(item) => updateItem(item.id, { is_active: !item.is_active })}
                              onDelete={handleDelete}
                              isSub
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              )
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
