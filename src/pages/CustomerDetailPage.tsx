import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import { usePermission } from '../hooks/usePermission';
import { StatusBadge } from '../components/ui/StatusBadge';
import { MemoTimeline } from '../components/MemoTimeline';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorState } from '../components/ui/ErrorState';
import { PermissionGuard } from '../components/PermissionGuard';
import type { Customer } from '../types';

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { statusOptions, users, customFields } = useAppStore();
  const { can, currentUser } = usePermission();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // 편집 폼 상태
  const [form, setForm] = useState({
    name: '', phone: '', email: '', assigned_to: '', status_id: '',
    extra_fields: {} as Record<string, string>,
  });

  const loadCustomer = async () => {
    if (!id) return;
    setLoading(true);
    const { data, error: err } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (err || !data) {
      setError(true);
    } else {
      setCustomer(data);
      setForm({
        name: data.name,
        phone: data.phone || '',
        email: data.email || '',
        assigned_to: data.assigned_to || '',
        status_id: data.status_id || '',
        extra_fields: (data.extra_fields || {}) as Record<string, string>,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCustomer();
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !currentUser) return;
    setSaving(true);

    // 상태 변경 이력 기록
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
    if (!error) navigate('/customers');
  };

  if (loading) return <LoadingSpinner message="고객 정보 로딩 중..." />;
  if (error || !customer) return <ErrorState message="고객을 찾을 수 없습니다." onRetry={loadCustomer} />;

  const assignedUser = users.find((u) => u.id === customer.assigned_to);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/customers')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          >
            ← 목록
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
          <StatusBadge statusId={customer.status_id} />
        </div>
        <div className="flex gap-2">
          <PermissionGuard action="edit">
            <button
              onClick={() => setEditing(!editing)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
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
              className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              삭제
            </button>
          </PermissionGuard>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 고객 기본 정보 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h2>

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
                    {statusOptions.filter((s) => s.is_active).map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* 동적 필드 */}
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

                {/* 동적 필드 표시 */}
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
        </div>

        {/* 상담 이력 타임라인 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <MemoTimeline customerId={customer.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
