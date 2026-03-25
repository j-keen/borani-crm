import { useState } from 'react';
import type { OptionItem } from '../../../types';

interface Props {
  providers: OptionItem[];
  activeView: string;
  onSelect: (view: string) => void;
  onAdd: (label: string) => void;
  onUpdate: (id: string, updates: Partial<OptionItem>) => void;
  onDelete: (id: string) => void;
  onReorder: (updates: { id: string; sort_order: number }[]) => void;
}

export function ProviderSidebar({ providers, activeView, onSelect, onAdd, onUpdate, onDelete, onReorder }: Props) {
  const [newLabel, setNewLabel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    onAdd(newLabel.trim());
    setNewLabel('');
  };

  const handleSaveEdit = (id: string) => {
    if (editValue.trim()) {
      onUpdate(id, { label: editValue.trim() });
    }
    setEditingId(null);
  };

  return (
    <div className="w-64 border-r border-gray-200 bg-white flex flex-col">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-3">설정 메뉴</h3>
        <button
          onClick={() => onSelect('common')}
          className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === 'common' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          공통 옵션 관리 (속도/기타)
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <h3 className="font-semibold text-gray-900 mb-3">통신사 목록</h3>
        <ul className="space-y-1">
          {providers.map((provider) => (
            <li key={provider.id} className="group flex items-center">
              {editingId === provider.id ? (
                <div className="flex w-full gap-1">
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(provider.id)}
                    className="flex-1 px-2 py-1 text-sm border border-indigo-300 rounded"
                  />
                  <button onClick={() => handleSaveEdit(provider.id)} className="text-xs text-indigo-600 px-2 py-1">저장</button>
                </div>
              ) : (
                <button
                  onClick={() => onSelect(provider.id)}
                  className={`flex-1 flex justify-between items-center text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    activeView === provider.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className={provider.is_active ? '' : 'line-through text-gray-400'}>{provider.label}</span>
                  
                  {activeView !== provider.id && (
                    <div className="hidden group-hover:flex gap-1 ml-2">
                       <span 
                        onClick={(e) => { e.stopPropagation(); setEditValue(provider.label); setEditingId(provider.id); }}
                        className="text-xs text-gray-400 hover:text-blue-600 p-1"
                      >수정</span>
                       <span 
                        onClick={(e) => { e.stopPropagation(); if(confirm('삭제하시겠습니까? 관련 하위 상품도 모두 지워집니다.')) onDelete(provider.id); }}
                        className="text-xs text-gray-400 hover:text-red-500 p-1"
                      >삭제</span>
                    </div>
                  )}
                </button>
              )}
            </li>
          ))}
        </ul>
        {providers.length === 0 && (
          <p className="text-sm text-gray-400 py-2">등록된 통신사가 없습니다.</p>
        )}

        <div className="mt-4 flex gap-1">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="통신사 추가 (Enter)"
            className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-gray-300 rounded-md"
          />
          <button onClick={handleAdd} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200">
            추가
          </button>
        </div>
      </div>
    </div>
  );
}
