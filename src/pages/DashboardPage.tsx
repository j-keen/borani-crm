import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { Memo, User } from '../types';

interface StatusCount {
  status_id: string;
  count: number;
}

interface AssigneeStats {
  user: User;
  total: number;
  completed: number;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { statusOptions, users } = useAppStore();
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
  const [recentMemos, setRecentMemos] = useState<(Memo & { author?: User; customer_name?: string })[]>([]);
  const [assigneeStats, setAssigneeStats] = useState<AssigneeStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      // 1. 상태별 고객 수
      const { data: customers } = await supabase.from('customers').select('id, status_id, assigned_to');

      if (customers) {
        const counts: Record<string, number> = {};
        customers.forEach((c) => {
          const sid = c.status_id || 'none';
          counts[sid] = (counts[sid] || 0) + 1;
        });
        setStatusCounts(
          Object.entries(counts).map(([status_id, count]) => ({ status_id, count }))
        );

        // 3. 담당자별 처리 현황
        const completedStatusIds = statusOptions
          .filter((s) => s.label === '완료' || s.label === '설치완료')
          .map((s) => s.id);

        const statsMap = new Map<string, { total: number; completed: number }>();
        customers.forEach((c) => {
          if (!c.assigned_to) return;
          const stat = statsMap.get(c.assigned_to) || { total: 0, completed: 0 };
          stat.total++;
          if (c.status_id && completedStatusIds.includes(c.status_id)) stat.completed++;
          statsMap.set(c.assigned_to, stat);
        });

        setAssigneeStats(
          Array.from(statsMap.entries())
            .map(([userId, stat]) => ({
              user: users.find((u) => u.id === userId) || { id: userId, name: '알 수 없음', email: '', role: 'staff' as const, view_scope: 'own' as const, created_at: '', updated_at: '' },
              ...stat,
            }))
            .sort((a, b) => b.total - a.total)
        );
      }

      // 2. 최근 7일 상담 활동
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: memos } = await supabase
        .from('memos')
        .select('*, author:users!memos_author_id_fkey(id, name)')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (memos) {
        // 고객 이름 가져오기
        const customerIds = [...new Set(memos.map((m) => m.customer_id))];
        const { data: customerNames } = await supabase
          .from('customers')
          .select('id, name')
          .in('id', customerIds);

        const nameMap = new Map(customerNames?.map((c) => [c.id, c.name]) || []);
        setRecentMemos(
          memos.map((m) => ({ ...m, customer_name: nameMap.get(m.customer_id) || '알 수 없음' }))
        );
      }

      setLoading(false);
    };

    loadDashboard();
  }, [statusOptions, users]);

  if (loading) return <LoadingSpinner message="대시보드 로딩 중..." />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>

      {/* 상태별 고객 수 요약 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statusOptions.filter((s) => s.is_active).map((status) => {
          const count = statusCounts.find((sc) => sc.status_id === status.id)?.count || 0;
          return (
            <button
              key={status.id}
              onClick={() => navigate(`/customers?status=${status.id}`)}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-indigo-300 transition-all text-left"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                <span className="text-sm font-medium text-gray-600">{status.label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 최근 7일 상담 활동 피드 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">최근 상담 활동</h2>
          {recentMemos.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">최근 7일간 상담 기록이 없습니다.</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {recentMemos.map((memo) => (
                <div
                  key={memo.id}
                  className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/customers/${memo.customer_id}`)}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-700">
                    {memo.author?.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{memo.author?.name}</span>
                      <span className="text-xs text-gray-400">→</span>
                      <span className="text-sm text-indigo-600">{memo.customer_name}</span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{memo.content}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {format(new Date(memo.created_at), 'MM.dd HH:mm', { locale: ko })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 담당자별 처리 현황 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">담당자별 처리 현황</h2>
          {assigneeStats.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">담당자 배정 데이터가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 text-gray-500 font-medium">담당자</th>
                    <th className="text-center py-2 text-gray-500 font-medium">전체</th>
                    <th className="text-center py-2 text-gray-500 font-medium">완료</th>
                    <th className="text-center py-2 text-gray-500 font-medium">진행률</th>
                  </tr>
                </thead>
                <tbody>
                  {assigneeStats.map((stat) => {
                    const rate = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0;
                    return (
                      <tr key={stat.user.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2.5 font-medium text-gray-900">{stat.user.name}</td>
                        <td className="py-2.5 text-center text-gray-600">{stat.total}</td>
                        <td className="py-2.5 text-center text-green-600">{stat.completed}</td>
                        <td className="py-2.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full transition-all"
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
