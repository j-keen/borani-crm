import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import { useAuth } from '../hooks/useAuth';
import type { StatusOption, CustomField, User, Role, ViewScope } from '../types';

type Tab = 'fields' | 'statuses' | 'accounts';

export function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('statuses');
  const { statusOptions, customFields, users, setStatusOptions, setCustomFields, setUsers } = useAppStore();
  const { loadAppData } = useAuth();

  // ===================== 상태값 관리 =====================
  const [newStatus, setNewStatus] = useState({ label: '', color: '#6B7280' });
  const [editingStatus, setEditingStatus] = useState<StatusOption | null>(null);

  const handleAddStatus = async () => {
    if (!newStatus.label.trim()) return;
    const maxOrder = Math.max(0, ...statusOptions.map((s) => s.sort_order));
    const { data } = await supabase.from('status_options').insert({
      label: newStatus.label.trim(),
      color: newStatus.color,
      sort_order: maxOrder + 1,
    }).select().single();
    if (data) {
      setStatusOptions([...statusOptions, data]);
      setNewStatus({ label: '', color: '#6B7280' });
    }
  };

  const handleUpdateStatus = async (status: StatusOption) => {
    await supabase.from('status_options').update({
      label: status.label,
      color: status.color,
      sort_order: status.sort_order,
      is_active: status.is_active,
    }).eq('id', status.id);
    setStatusOptions(statusOptions.map((s) => (s.id === status.id ? status : s)));
    setEditingStatus(null);
  };

  const handleDeleteStatus = async (id: string) => {
    if (!window.confirm('이 상태값을 삭제하시겠습니까?')) return;
    await supabase.from('status_options').delete().eq('id', id);
    setStatusOptions(statusOptions.filter((s) => s.id !== id));
  };

  const moveStatus = async (index: number, direction: -1 | 1) => {
    const sorted = [...statusOptions].sort((a, b) => a.sort_order - b.sort_order);
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;

    const temp = sorted[index].sort_order;
    sorted[index].sort_order = sorted[targetIdx].sort_order;
    sorted[targetIdx].sort_order = temp;

    await Promise.all([
      supabase.from('status_options').update({ sort_order: sorted[index].sort_order }).eq('id', sorted[index].id),
      supabase.from('status_options').update({ sort_order: sorted[targetIdx].sort_order }).eq('id', sorted[targetIdx].id),
    ]);
    setStatusOptions([...sorted]);
  };

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
          <h2 className="text-lg font-semibold text-gray-900">상태값 관리</h2>
          <p className="text-sm text-gray-500">고객 진행 상태를 추가/수정/삭제하고 순서를 변경할 수 있습니다.</p>

          {/* 새 상태 추가 */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">상태명</label>
              <input
                type="text"
                value={newStatus.label}
                onChange={(e) => setNewStatus({ ...newStatus, label: e.target.value })}
                placeholder="새 상태값"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">색상</label>
              <input
                type="color"
                value={newStatus.color}
                onChange={(e) => setNewStatus({ ...newStatus, color: e.target.value })}
                className="w-10 h-9 border border-gray-300 rounded-lg cursor-pointer"
              />
            </div>
            <button
              onClick={handleAddStatus}
              disabled={!newStatus.label.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              추가
            </button>
          </div>

          {/* 상태 목록 */}
          <div className="space-y-2">
            {[...statusOptions].sort((a, b) => a.sort_order - b.sort_order).map((status, idx) => (
              <div key={status.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                {editingStatus?.id === status.id ? (
                  <>
                    <input
                      type="text"
                      value={editingStatus.label}
                      onChange={(e) => setEditingStatus({ ...editingStatus, label: e.target.value })}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <input
                      type="color"
                      value={editingStatus.color}
                      onChange={(e) => setEditingStatus({ ...editingStatus, color: e.target.value })}
                      className="w-8 h-7 border border-gray-300 rounded cursor-pointer"
                    />
                    <button onClick={() => handleUpdateStatus(editingStatus)} className="text-xs text-green-600 hover:text-green-700 font-medium">저장</button>
                    <button onClick={() => setEditingStatus(null)} className="text-xs text-gray-500 hover:text-gray-700">취소</button>
                  </>
                ) : (
                  <>
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }} />
                    <span className={`flex-1 text-sm ${status.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                      {status.label}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveStatus(idx, -1)} className="p-1 text-gray-400 hover:text-gray-600" title="위로">↑</button>
                      <button onClick={() => moveStatus(idx, 1)} className="p-1 text-gray-400 hover:text-gray-600" title="아래로">↓</button>
                      <button onClick={() => setEditingStatus({ ...status })} className="p-1 text-blue-500 hover:text-blue-700 text-xs">수정</button>
                      <button
                        onClick={() => handleUpdateStatus({ ...status, is_active: !status.is_active })}
                        className={`p-1 text-xs ${status.is_active ? 'text-amber-500' : 'text-green-500'}`}
                      >
                        {status.is_active ? '비활성화' : '활성화'}
                      </button>
                      <button onClick={() => handleDeleteStatus(status.id)} className="p-1 text-red-400 hover:text-red-600 text-xs">삭제</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
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
