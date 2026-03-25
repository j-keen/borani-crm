import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import { StatusManager } from '../components/admin/StatusManager';
import { ProductLayout } from '../components/admin/ProductManagement/ProductLayout';
import type { CustomField, Role, ViewScope } from '../types';

type Tab = 'fields' | 'statuses' | 'products' | 'accounts';

export function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('statuses');
  const { customFields, users, setCustomFields, setUsers } = useAppStore();

  // ===================== 상태값 관리 =====================
  // 상태관리는 StatusManager 컴포넌트로 분리되었습니다.

  // ===================== 커스텀 필드 관리 =====================
  const [newField, setNewField] = useState({ field_label: '', field_key: '', field_type: 'text' as CustomField['field_type'] });

  const handleAddField = async () => {
    if (!newField.field_label.trim()) return;
    const key = newField.field_key.trim() || newField.field_label.trim().toLowerCase().replace(/\s+/g, '_');
    const maxOrder = Math.max(0, ...customFields.map((f) => f.sort_order));
    const { data } = await supabase.from('custom_fields').insert({
      field_label: newField.field_label.trim(),
      field_key: key,
      field_type: newField.field_type,
      sort_order: maxOrder + 1,
    }).select().single();
    if (data) {
      setCustomFields([...customFields, data]);
      setNewField({ field_label: '', field_key: '', field_type: 'text' });
    }
  };

  const handleDeleteField = async (id: string) => {
    if (!window.confirm('이 필드를 삭제하시겠습니까? 기존 데이터는 유지됩니다.')) return;
    await supabase.from('custom_fields').delete().eq('id', id);
    setCustomFields(customFields.filter((f) => f.id !== id));
  };

  const moveField = async (index: number, direction: -1 | 1) => {
    const sorted = [...customFields].sort((a, b) => a.sort_order - b.sort_order);
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;

    const temp = sorted[index].sort_order;
    sorted[index].sort_order = sorted[targetIdx].sort_order;
    sorted[targetIdx].sort_order = temp;

    await Promise.all([
      supabase.from('custom_fields').update({ sort_order: sorted[index].sort_order }).eq('id', sorted[index].id),
      supabase.from('custom_fields').update({ sort_order: sorted[targetIdx].sort_order }).eq('id', sorted[targetIdx].id),
    ]);
    setCustomFields([...sorted]);
  };

  // ===================== 계정 관리 =====================
  const handleUpdateUser = async (userId: string, updates: { role?: Role; view_scope?: ViewScope }) => {
    await supabase.from('users').update(updates).eq('id', userId);
    setUsers(users.map((u) => (u.id === userId ? { ...u, ...updates } : u)));
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'statuses', label: '상태값 관리' },
    { key: 'products', label: '통신 상품 관리' },
    { key: 'fields', label: '동적 필드 관리' },
    { key: 'accounts', label: '계정 & 권한' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">관리자 설정</h1>

      {/* 탭 네비게이션 */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== 상태값 관리 탭 ===== */}
      {activeTab === 'statuses' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">상태 & 옵션 관리</h2>
          <p className="text-sm text-gray-500">고객의 진행 상태(대분류) 및 하위 옵션(중분류)을 설정합니다.</p>
          <StatusManager />
        </div>
      )}

      {/* ===== 통신 상품 관리 탭 ===== */}
      {activeTab === 'products' && (
        <div className="space-y-4">
           {/* ProductLayout 컴포넌트 내부에서 컨테이너 스타일링을 포함하고 있음 */}
           <ProductLayout />
        </div>
      )}

      {/* ===== 동적 필드 관리 탭 ===== */}
      {activeTab === 'fields' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">동적 필드 관리</h2>
          <p className="text-sm text-gray-500">고객 정보에 추가할 커스텀 필드를 관리합니다.</p>

          {/* 새 필드 추가 */}
          <div className="flex flex-col sm:flex-row gap-2 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-gray-500 mb-1">필드명</label>
              <input
                type="text"
                value={newField.field_label}
                onChange={(e) => setNewField({ ...newField, field_label: e.target.value })}
                placeholder="예: 주소, 회사명"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">타입</label>
              <select
                value={newField.field_type}
                onChange={(e) => setNewField({ ...newField, field_type: e.target.value as CustomField['field_type'] })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="text">텍스트</option>
                <option value="number">숫자</option>
                <option value="date">날짜</option>
                <option value="textarea">장문 텍스트</option>
                <option value="select">선택형</option>
              </select>
            </div>
            <button
              onClick={handleAddField}
              disabled={!newField.field_label.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              추가
            </button>
          </div>

          {/* 필드 목록 */}
          <div className="space-y-2">
            {[...customFields].sort((a, b) => a.sort_order - b.sort_order).map((field, idx) => (
              <div key={field.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                <span className="flex-1 text-sm text-gray-900">{field.field_label}</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                  {field.field_type === 'text' ? '텍스트' : field.field_type === 'number' ? '숫자' : field.field_type === 'date' ? '날짜' : field.field_type === 'textarea' ? '장문' : '선택형'}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => moveField(idx, -1)} className="p-1 text-gray-400 hover:text-gray-600">↑</button>
                  <button onClick={() => moveField(idx, 1)} className="p-1 text-gray-400 hover:text-gray-600">↓</button>
                  <button onClick={() => handleDeleteField(field.id)} className="p-1 text-red-400 hover:text-red-600 text-xs">삭제</button>
                </div>
              </div>
            ))}
            {customFields.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">추가된 커스텀 필드가 없습니다.</p>
            )}
          </div>
        </div>
      )}

      {/* ===== 계정 & 권한 관리 탭 ===== */}
      {activeTab === 'accounts' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">계정 & 권한 관리</h2>
          <p className="text-sm text-gray-500">계정별 역할과 데이터 열람 범위를 설정합니다.</p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-medium text-gray-500">이름</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">이메일</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">역할</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">열람 범위</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium text-gray-900">{user.name}</td>
                    <td className="py-3 px-2 text-gray-600">{user.email}</td>
                    <td className="py-3 px-2">
                      <select
                        value={user.role}
                        onChange={(e) => handleUpdateUser(user.id, { role: e.target.value as Role })}
                        className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="admin">최고관리자</option>
                        <option value="staff">일반직원</option>
                        <option value="viewer">열람전용</option>
                      </select>
                    </td>
                    <td className="py-3 px-2">
                      <select
                        value={user.view_scope}
                        onChange={(e) => handleUpdateUser(user.id, { view_scope: e.target.value as ViewScope })}
                        className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="all">전체 고객</option>
                        <option value="own">본인 담당만</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
