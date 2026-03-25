import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import { usePermission } from '../hooks/usePermission';
import { StatusBadge } from '../components/ui/StatusBadge';
import { CustomerCard } from '../components/CustomerCard';
import { CustomerDetailModal } from '../components/CustomerDetailModal';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import type { Customer } from '../types';

export function CustomersPage() {
  const [searchParams] = useSearchParams();
  const { statusOptions, users, customFields } = useAppStore();
  const { can } = usePermission();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // 필터 상태
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // 고객 상세 모달
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // 신규 고객 모달
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', assigned_to: '', status_id: '', extra_fields: {} as Record<string, string> });
  const [saving, setSaving] = useState(false);

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.startsWith('02')) {
      // 서울 지역번호: 02-XXXX-XXXX
      if (numbers.length <= 2) return numbers;
      if (numbers.length <= 6) return `${numbers.slice(0, 2)}-${numbers.slice(2)}`;
      return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6, 10)}`;
    }
    // 휴대폰/기타: 010-XXXX-XXXX, 031-XXX-XXXX
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  const loadCustomers = async () => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: sortOrder === 'asc' });

    if (err) {
      setError(true);
    } else {
      setCustomers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCustomers();
  }, [sortOrder]);

  // URL 파라미터로 상태 필터 동기화
  useEffect(() => {
    const s = searchParams.get('status');
    if (s) setStatusFilter(s);
  }, [searchParams]);

  // 필터링된 고객 목록
  const filtered = useMemo(() => {
    return customers.filter((c) => {
      // 검색 (이름, 연락처)
      if (search) {
        const q = search.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchPhone = c.phone?.toLowerCase().includes(q);
        if (!matchName && !matchPhone) return false;
      }
      // 상태 필터
      if (statusFilter && c.status_id !== statusFilter) return false;
      // 담당자 필터
      if (assigneeFilter && c.assigned_to !== assigneeFilter) return false;
      return true;
    });
  }, [customers, search, statusFilter, assigneeFilter]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('customers').insert({
      name: newCustomer.name,
      phone: newCustomer.phone || null,
      email: newCustomer.email || null,
      assigned_to: newCustomer.assigned_to || null,
      status_id: newCustomer.status_id || statusOptions[0]?.id || null,
      extra_fields: newCustomer.extra_fields,
    });
    setSaving(false);
    if (!error) {
      setShowAddModal(false);
      setNewCustomer({ name: '', phone: '', email: '', assigned_to: '', status_id: '', extra_fields: {} });
      loadCustomers();
    }
  };

  if (loading) return <LoadingSpinner message="고객 목록 로딩 중..." />;
  if (error) return <ErrorState onRetry={loadCustomers} />;

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">고객 관리</h1>
        {can('create') && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + 신규 고객
          </button>
        )}
      </div>

      {/* 검색 & 필터 바 */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-gray-200">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름 또는 연락처로 검색..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">전체 상태</option>
          {statusOptions.filter((s) => s.is_active).map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">전체 담당자</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <button
          onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
        >
          등록일 {sortOrder === 'desc' ? '↓ 최신' : '↑ 오래된'}
        </button>
      </div>

      {/* 결과 수 */}
      <p className="text-sm text-gray-500">{filtered.length}건의 고객</p>

      {filtered.length === 0 ? (
        <EmptyState
          title="고객이 없습니다"
          description={search || statusFilter || assigneeFilter ? '필터 조건에 맞는 고객이 없습니다.' : '첫 고객을 등록해보세요.'}
        />
      ) : (
        <>
          {/* 데스크톱: 테이블 */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">이름</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">연락처</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">이메일</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">담당자</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">상태</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">등록일</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const assignedUser = users.find((u) => u.id === c.assigned_to);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCustomerId(c.id)}
                      className="border-b border-gray-100 hover:bg-indigo-50/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                      <td className="px-4 py-3 text-gray-600">{c.phone || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{c.email || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{assignedUser?.name || '-'}</td>
                      <td className="px-4 py-3"><StatusBadge statusId={c.status_id} /></td>
                      <td className="px-4 py-3 text-gray-500">
                        {format(new Date(c.created_at), 'yyyy.MM.dd', { locale: ko })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 모바일: 카드 리스트 */}
          <div className="md:hidden grid gap-3">
            {filtered.map((c) => (
              <CustomerCard key={c.id} customer={c} onClick={() => setSelectedCustomerId(c.id)} />
            ))}
          </div>
        </>
      )}

      {/* 신규 고객 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">신규 고객 등록</h2>
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
                <input
                  type="text"
                  required
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: formatPhoneNumber(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="01000000000"
                  maxLength={13}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">담당자</label>
                <select
                  value={newCustomer.assigned_to}
                  onChange={(e) => setNewCustomer({ ...newCustomer, assigned_to: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">선택 안함</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                <select
                  value={newCustomer.status_id}
                  onChange={(e) => setNewCustomer({ ...newCustomer, status_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">선택</option>
                  {statusOptions.filter((s) => s.is_active).map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* 동적 필드 */}
              {customFields.filter((f) => f.is_active).map((field) => (
                <div key={field.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field.field_label}</label>
                  {field.field_type === 'textarea' ? (
                    <textarea
                      value={newCustomer.extra_fields[field.field_key] || ''}
                      onChange={(e) => setNewCustomer({
                        ...newCustomer,
                        extra_fields: { ...newCustomer.extra_fields, [field.field_key]: e.target.value },
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      rows={2}
                    />
                  ) : field.field_type === 'select' ? (
                    <select
                      value={newCustomer.extra_fields[field.field_key] || ''}
                      onChange={(e) => setNewCustomer({
                        ...newCustomer,
                        extra_fields: { ...newCustomer.extra_fields, [field.field_key]: e.target.value },
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
                      value={newCustomer.extra_fields[field.field_key] || ''}
                      onChange={(e) => setNewCustomer({
                        ...newCustomer,
                        extra_fields: { ...newCustomer.extra_fields, [field.field_key]: e.target.value },
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>
              ))}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? '저장 중...' : '등록'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 고객 상세 모달 */}
      {selectedCustomerId && (
        <CustomerDetailModal
          customerId={selectedCustomerId}
          onClose={() => setSelectedCustomerId(null)}
          onDeleted={loadCustomers}
        />
      )}
    </div>
  );
}
