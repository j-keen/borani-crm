import { useState } from 'react';
import type { OptionItem } from '../../../types';

interface Props {
  items: OptionItem[];
  onAdd: (item: Omit<OptionItem, 'id' | 'created_at'>) => void;
  onUpdate: (id: string, updates: Partial<OptionItem>) => void;
  onDelete: (id: string) => void;
  onReorder: (updates: { id: string; sort_order: number }[]) => void;
}

export function CommonOptionEditor({ items, onAdd, onUpdate, onDelete, onReorder }: Props) {
  const speeds = items.filter((i) => i.category_code === 'speed').sort((a,b) => a.sort_order - b.sort_order);
  const addons = items.filter((i) => i.category_code === 'addon').sort((a,b) => a.sort_order - b.sort_order);

  const [newSpeed, setNewSpeed] = useState('');
  const [newAddon, setNewAddon] = useState('');

  const renderList = (categoryCode: string, title: string, list: OptionItem[], newValue: string, setter: (v: string) => void) => (
    <div className="bg-white border text-sm border-gray-200 rounded-lg overflow-hidden flex-1">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <h4 className="font-semibold text-gray-700">{title}</h4>
        <span className="text-xs text-gray-500">{list.length}개</span>
      </div>
      <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
        {list.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-2 hover:bg-gray-50 border border-transparent hover:border-gray-100 rounded-md group">
             <span className={item.is_active ? 'text-gray-900 font-medium' : 'text-gray-400 line-through'}>{item.label}</span>
             <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
               <button 
                 onClick={() => onUpdate(item.id, { is_active: !item.is_active })}
                 className={`text-xs px-2 py-1 rounded ${item.is_active ? 'text-amber-600 bg-amber-50' : 'text-green-600 bg-green-50'}`}
               >
                 {item.is_active ? '숨기기' : '보이기'}
               </button>
               <button onClick={() => { if(confirm('삭제하시겠습니까?')) onDelete(item.id); }} className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded">삭제</button>
             </div>
          </div>
        ))}
         {list.length === 0 && <p className="text-gray-400 text-center py-4">항목이 없습니다.</p>}
      </div>
      <div className="p-3 border-t border-gray-100 bg-gray-50 flex gap-2">
         <input
           type="text"
           value={newValue}
           onChange={(e) => setter(e.target.value)}
           onKeyDown={(e) => {
             if (e.key === 'Enter' && newValue.trim()) {
               onAdd({ category_code: categoryCode, parent_id: null, label: newValue.trim(), is_active: true, sort_order: list.length });
               setter('');
             }
           }}
           placeholder="새 항목 이름 입력 + Enter"
           className="flex-1 border-gray-300 rounded-md px-3 py-1.5 focus:ring-1 focus:ring-indigo-500"
         />
         <button 
           onClick={() => {
             if (newValue.trim()) {
               onAdd({ category_code: categoryCode, parent_id: null, label: newValue.trim(), is_active: true, sort_order: list.length });
               setter('');
             }
           }}
           className="bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700"
         >추가</button>
       </div>
    </div>
  );

  return (
    <div className="p-6 h-full flex flex-col">
       <div className="mb-6">
         <h2 className="text-2xl font-bold text-gray-900">공통 옵션 관리</h2>
         <p className="text-gray-500 mt-1">통신사와 무관하게 공통으로 적용되는 옵션(인터넷 속도, 부가 옵션 등)을 관리합니다.</p>
       </div>
       <div className="flex flex-col lg:flex-row gap-6 h-full items-start">
         {renderList('speed', '인터넷 속도 리스트', speeds, newSpeed, setNewSpeed)}
         {renderList('addon', '기타 부가옵션 (유무 등)', addons, newAddon, setNewAddon)}
       </div>
    </div>
  );
}
