import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import { useStatusStore } from '../store/useStatusStore';
import { useOptions } from '../hooks/useOptions';
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
  const { items: options, fetchOptions } = useOptions();
  const { currentUser } = usePermission();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '', phone: '', email: '', assigned_to: '', status_id: '',
    provider_id: '', plan_id: '', tv_id: '', speed_id: '', addons_json: [] as string[],
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
        provider_id: data.provider_id || '',
        plan_id: data.plan_id || '',
        tv_id: data.tv_id || '',
        speed_id: data.speed_id || '',
        addons_json: (data.addons_json || []) as string[],
        extra_fields: (data.extra_fields || {}) as Record<string, string>,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCustomer();
    fetchOptions();
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

    if (form.status_id !== customer.status_id) {
      await supabase.from('status_history').insert({
        customer_id: customer.id,
        from_status_id: customer.status_id,
        to_status_id: form.status_id || null,
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
        provider_id: form.provider_id || null,
        plan_id: form.plan_id || null,
        tv_id: form.tv_id || null,
        speed_id: form.speed_id || null,
        addons_json: form.addons_json,
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
                <StatusBadge statusId={customer.status_id} />
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
                        onChange={(e) => setForm({ ...form, status_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">미지정</option>
                        {statusOptions.filter((s) => s.is_active && !s.parent_id).map((s) => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                      <h4 className="text-xs font-semibold text-gray-900 mb-2">통신 상품 정보</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">통신사</label>
                          <select
                            value={form.provider_id}
                            onChange={(e) => setForm({ ...form, provider_id: e.target.value, plan_id: '', tv_id: '' })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">선택 안함</option>
                            {options.filter((o) => o.category_code === 'provider' && o.is_active).map((o) => (
                              <option key={o.id} value={o.id}>{o.label}</option>
                            ))}
                          </select>
                        </div>
                        
                        {form.provider_id && (
                          <div className="grid grid-cols-2 gap-2 border bg-gray-50 border-gray-200 p-2 rounded-lg">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">요금제 (종속)</label>
                              <select
                                value={form.plan_id}
                                onChange={(e) => setForm({ ...form, plan_id: e.target.value })}
                                className="w-full px-2 py-1.5 border border-indigo-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                              >
                                <option value="">선택</option>
                                {options.filter((o) => o.category_code === 'plan' && o.is_active && o.parent_id === form.provider_id).map((o) => (
                                  <option key={o.id} value={o.id}>{o.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">TV 옵션 (종속)</label>
                              <select
                                value={form.tv_id}
                                onChange={(e) => setForm({ ...form, tv_id: e.target.value })}
                                className="w-full px-2 py-1.5 border border-indigo-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                              >
                                <option value="">선택 안함</option>
                                {options.filter((o) => o.category_code === 'tv' && o.is_active && o.parent_id === form.provider_id).map((o) => (
                                  <option key={o.id} value={o.id}>{o.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">인터넷 속도</label>
                          <select
                            value={form.speed_id}
                            onChange={(e) => setForm({ ...form, speed_id: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">선택 안함</option>
                            {options.filter((o) => o.category_code === 'speed' && o.is_active).map((o) => (
                              <option key={o.id} value={o.id}>{o.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">부가 옵션 (다중 선택)</label>
                          <div className="flex items-center gap-3 flex-wrap">
                            {options.filter((o) => o.category_code === 'addon' && o.is_active).map((o) => (
                               <label key={o.id} className="flex items-center gap-1 text-sm text-gray-700 cursor-pointer">
                                 <input 
                                   type="checkbox" 
                                   checked={form.addons_json.includes(o.id)}
                                   onChange={(e) => {
                                      if (e.target.checked) setForm({...form, addons_json: [...form.addons_json, o.id]});
                                      else setForm({...form, addons_json: form.addons_json.filter(id => id !== o.id)});
                                   }}
                                   className="rounded text-indigo-600 focus:ring-indigo-500 border-gray-300" 
                                 />
                                 {o.label}
                               </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

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

                    <div className="pt-2 mt-2 border-t border-gray-100">
                      <dt className="text-xs font-medium text-gray-500 mb-1">통신 상품 정보</dt>
                      <dd className="text-sm text-gray-900 space-y-1">
                        {options.find(o => o.id === customer.provider_id) ? (
                            <p><span className="text-gray-500 mr-2">통신사:</span> {options.find(o => o.id === customer.provider_id)?.label}</p>
                        ) : null}
                        {options.find(o => o.id === customer.plan_id) ? (
                            <p><span className="text-gray-500 mr-2">요금제:</span> {options.find(o => o.id === customer.plan_id)?.label}</p>
                        ) : null}
                        {options.find(o => o.id === customer.tv_id) ? (
                            <p><span className="text-gray-500 mr-2">TV:</span> {options.find(o => o.id === customer.tv_id)?.label}</p>
                        ) : null}
                        {options.find(o => o.id === customer.speed_id) ? (
                            <p><span className="text-gray-500 mr-2">속도:</span> {options.find(o => o.id === customer.speed_id)?.label}</p>
                        ) : null}
                        {customer.addons_json && customer.addons_json.length > 0 ? (
                            <p><span className="text-gray-500 mr-2">부가서비스:</span> {customer.addons_json.map(id => options.find(o => o.id === id)?.label).filter(Boolean).join(', ')}</p>
                        ) : null}
                        {!customer.provider_id && !customer.plan_id && !customer.tv_id && !customer.speed_id && (!customer.addons_json || customer.addons_json.length === 0) && (
                            <p className="text-gray-400">등록된 상품 없음</p>
                        )}
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
