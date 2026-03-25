import { useEffect, useState } from 'react';
import { useOptions } from '../../../hooks/useOptions';
import { ProviderSidebar } from './ProviderSidebar';
import { DependentListEditor } from './DependentListEditor';
import { CommonOptionEditor } from './CommonOptionEditor';

export function ProductLayout() {
  const { items, loading, fetchOptions, addItem, updateItem, deleteItem, reorderItems } = useOptions();
  const [activeView, setActiveView] = useState('common');

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const providers = items.filter(i => i.category_code === 'provider').sort((a,b) => a.sort_order - b.sort_order);
  const activeProvider = providers.find(p => p.id === activeView);

  return (
    <div className="flex bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ minHeight: '600px' }}>
      <ProviderSidebar 
        providers={providers}
        activeView={activeView}
        onSelect={setActiveView}
        onAdd={(label) => addItem({ category_code: 'provider', parent_id: null, label, is_active: true, sort_order: providers.length })}
        onUpdate={updateItem}
        onDelete={deleteItem}
        onReorder={reorderItems}
      />
      
      <div className="flex-1 bg-gray-50 flex flex-col">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center p-8 text-gray-400">옵션 정보를 불러오는 중...</div>
        ) : activeView === 'common' ? (
           <CommonOptionEditor 
             items={items}
             onAdd={addItem}
             onUpdate={updateItem}
             onDelete={deleteItem}
             onReorder={reorderItems}
           />
        ) : activeProvider ? (
           <DependentListEditor 
             provider={activeProvider}
             items={items.filter(i => i.parent_id === activeProvider.id)}
             onAdd={addItem}
             onUpdate={updateItem}
             onDelete={deleteItem}
             onReorder={reorderItems}
           />
        ) : (
           <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center h-full">
             좌측 메뉴에서 통신사나 공통 옵션을 선택해 주세요.
           </div>
        )}
      </div>
    </div>
  );
}
