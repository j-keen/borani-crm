import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import { useStatusStore } from '../store/useStatusStore';
import { usePermission } from '../hooks/usePermission';
import { StatusBadge } from './ui/StatusBadge';
import { MemoTimeline } from './MemoTimeline';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { PermissionGuard } from './PermissionGuard';
import type { Customer } from '../types';

interface Props {
  customerId: string;
  onClose: () => void;
  onDeleted?: () => void;
}

export function CustomerDetailModal({ customerId, onClose, onDeleted }: Props) {
  const { users, customFields } = useAppStore();
  const { items: statusOptions } = useStatusStore();
  const { currentUser } = usePermission();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '', phone: '', email: '', assigned_to: '', status_id: '', option_id: '',
    extra_fields: {} as Record<string, string>,
  });

  const loadCustomer = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (data) {
      setCustomer(data);
      setForm({
        name: data.name,
        phone: data.phone || '',
        email: data.email || '',
        assigned_to: data.assigned_to || '',
        status_id: data.status_id || '',
        option_id: data.option_id || '',
        extra_fields: (data.extra_fields || {}) as Record<string, string>,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCustomer();
  }, [customerId]);

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !currentUser) return;
    setSaving(true);

    if (form.status_id !== customer.status_id || form.option_id !== customer.option_id) {
      await supabase.from('status_history').insert({
        customer_id: customer.id,
        from_status_id: customer.status_id,
        to_status_id: form.status_id || null,
        from_option_id: customer.option_id || null,
        to_option_id: form.option_id || null,
        changed_by: currentUser.id,
      });
    }

    const { error } = await supabase
      .from('customers')
      .update({
        name: form.name,
        phone: form.phone || null,
        email: form.email || null,
        assigned_to: form.assigned_to || null,
        status_id: form.status_id || null,
        option_id: form.option_id || null,
        extra_fields: form.extra_fields,
      })
      .eq('id', customer.id);

    setSaving(false);
    if (!error) {
      setEditing(false);
      loadCustomer();
    }
  };

  const handleDelete = async () => {
    if (!customer) return;
    if (!window.confirm(`"${customer.name}" 고객을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;

    const { error } = await supabase.from('customers').delete().eq('id', customer.id);
    if (!error) {
      onClose();
      onDeleted?.();
    }
  };

  const assignedUser = customer ? users.find((u) => u.id === customer.assigned_to) : null;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {loading || !customer ? (
          <div className="p-8">
            <LoadingSpinner message="고객 정보 로딩 중..." />
          </div>
        ) : (
          <>
            {/* 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900">{customer.name}</h2>
                <StatusBadge statusId={customer.status_id} optionId={customer.option_id} />
              </div>
              <div className="flex items-center gap-2">
                <PermissionGuard action="edit">
                  <button
                    onClick={() => setEditing(!editing)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      editing
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {editing ? '취소' : '수정'}
                  </button>
                </PermissionGuard>
                <PermissionGuard action="delete">
                  <button
                    onClick={handleDelete}
                    className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    삭제
                  </button>
                </PermissionGuard>
                <button
                  onClick={onClose}
                  className="ml-2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 본문 */}
            <div className="grid lg:grid-cols-3 gap-6 p-6">
              {/* 기본 정보 */}
              <div className="lg:col-span-1">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">기본 정보</h3>
                {editing ? (
                  <form onSubmit={handleSave} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">이름</label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">연락처</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">이메일</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">담당자</label>
                      <select
                        value={form.assigned_to}
                        onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">미배정</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">상태</label>
                      <select
                        value={form.status_id}
                        onChange={(e) => setForm({ ...form, status_id: e.target.value, option_id: '' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">미지정</option>
                        {statusOptions.filter((s) => s.is_active && !s.parent_id).map((s) => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </div>

                    {form.status_id && statusOptions.some(s => s.parent_id === form.status_id && s.is_active) && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">상세 옵션</label>
                        <select
                          value={form.option_id}
                          onChange={(e) => setForm({ ...form, option_id: e.target.value })}
                          className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-blue-50"
                        >
                          <option value="">옵션 선택</option>
                          {statusOptions.filter((s) => s.is_active && s.parent_id === form.status_id).map((s) => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {customFields.filter((f) => f.is_active).map((field) => (
                      <div key={field.id}>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{field.field_label}</label>
                        {field.field_type === 'textarea' ? (
                          <textarea
                            value={form.extra_fields[field.field_key] || ''}
                            onChange={(e) => setForm({
                              ...form,
                              extra_fields: { ...form.extra_fields, [field.field_key]: e.target.value },
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                            rows={2}
                          />
                        ) : field.field_type === 'select' ? (
                          <select
                            value={form.extra_fields[field.field_key] || ''}
                            onChange={(e) => setForm({
                              ...form,
                              extra_fields: { ...form.extra_fields, [field.field_key]: e.target.value },
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">선택</option>
                            {field.options.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'}
                            value={form.extra_fields[field.field_key] || ''}
                            onChange={(e) => setForm({
                              ...form,
                              extra_fields: { ...form.extra_fields, [field.field_key]: e.target.value },
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                          />
                        )}
                      </div>
                    ))}

                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full mt-2 py-2 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {saving ? '저장 중...' : '저장'}
                    </button>
                  </form>
                ) : (
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-xs font-medium text-gray-500">연락처</dt>
                      <dd className="text-sm text-gray-900">{customer.phone || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500">이메일</dt>
                      <dd className="text-sm text-gray-900">{customer.email || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500">담당자</dt>
                      <dd className="text-sm text-gray-900">{assignedUser?.name || '미배정'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500">등록일</dt>
                      <dd className="text-sm text-gray-900">
                        {new Date(customer.created_at).toLocaleDateString('ko-KR')}
                      </dd>
                    </div>
                    {customFields.filter((f) => f.is_active).map((field) => {
                      const value = customer.extra_fields?.[field.field_key];
                      return (
                        <div key={field.id}>
                          <dt className="text-xs font-medium text-gray-500">{field.field_label}</dt>
                          <dd className="text-sm text-gray-900">{value || '-'}</dd>
                        </div>
                      );
                    })}
                  </dl>
                )}
              </div>

              {/* 상담 이력 */}
              <div className="lg:col-span-2">
                <MemoTimeline customerId={customer.id} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
