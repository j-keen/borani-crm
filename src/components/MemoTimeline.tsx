import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { usePermission } from '../hooks/usePermission';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { EmptyState } from './ui/EmptyState';
import { StatusBadge } from './ui/StatusBadge';
import type { Memo, StatusHistory, User } from '../types';

interface Props {
  customerId: string;
}

type TimelineItem =
  | { type: 'memo'; data: Memo & { author?: User }; date: string }
  | { type: 'status_change'; data: StatusHistory & { changer?: User }; date: string };

// 상담 이력 타임라인 컴포넌트
export function MemoTimeline({ customerId }: Props) {
  const { can, currentUser } = usePermission();
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMemo, setNewMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showMemoModal, setShowMemoModal] = useState(false);

  const loadTimeline = async () => {
    setLoading(true);
    const [memosRes, historyRes] = await Promise.all([
      supabase
        .from('memos')
        .select('*, author:users!memos_author_id_fkey(*)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false }),
      supabase
        .from('status_history')
        .select('*, from_status:status_options!status_history_from_status_id_fkey(*), to_status:status_options!status_history_to_status_id_fkey(*), changer:users!status_history_changed_by_fkey(*)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false }),
    ]);

    const timeline: TimelineItem[] = [];

    if (memosRes.data) {
      memosRes.data.forEach((m) =>
        timeline.push({ type: 'memo', data: m, date: m.created_at })
      );
    }
    if (historyRes.data) {
      historyRes.data.forEach((h) =>
        timeline.push({ type: 'status_change', data: h, date: h.created_at })
      );
    }

    // 최신순 정렬
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setItems(timeline);
    setLoading(false);
  };

  useEffect(() => {
    loadTimeline();
  }, [customerId]);

  const handleSubmitMemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemo.trim() || !currentUser) return;

    setSubmitting(true);
    await supabase.from('memos').insert({
      customer_id: customerId,
      content: newMemo.trim(),
      author_id: currentUser.id,
    });
    setNewMemo('');
    setSubmitting(false);
    setShowMemoModal(false);
    loadTimeline();
  };

  if (loading) return <LoadingSpinner message="상담 이력 로딩 중..." />;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">상담 이력</h3>

      {/* 메모 작성 버튼 */}
      {can('write_memo') && (
        <button
          onClick={() => setShowMemoModal(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + 메모 작성
        </button>
      )}

      {/* 메모 작성 모달 */}
      {showMemoModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowMemoModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">메모 작성</h2>
            <form onSubmit={handleSubmitMemo} className="space-y-4">
              <textarea
                value={newMemo}
                onChange={(e) => setNewMemo(e.target.value)}
                placeholder="상담 메모를 입력하세요..."
                rows={5}
                autoFocus
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              />
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting || !newMemo.trim()}
                  className="flex-1 py-2 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? '저장 중...' : '저장'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowMemoModal(false); setNewMemo(''); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 타임라인 */}
      {items.length === 0 ? (
        <EmptyState title="상담 이력 없음" description="아직 등록된 상담 이력이 없습니다." />
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
          <div className="space-y-4">
            {items.map((item) => (
              <div key={`${item.type}-${item.type === 'memo' ? item.data.id : item.data.id}`} className="relative pl-10">
                {/* 타임라인 도트 */}
                <div
                  className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-white ${
                    item.type === 'memo' ? 'bg-indigo-500' : 'bg-amber-500'
                  }`}
                />

                <div className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm">
                  {item.type === 'memo' ? (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-indigo-600">
                          💬 {item.data.author?.name ?? '알 수 없음'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {format(new Date(item.date), 'yyyy.MM.dd HH:mm', { locale: ko })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.data.content}</p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-amber-600">
                          🔄 상태 변경 — {item.data.changer?.name ?? '알 수 없음'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {format(new Date(item.date), 'yyyy.MM.dd HH:mm', { locale: ko })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <StatusBadge statusId={item.data.from_status_id} />
                        <span className="text-gray-400">→</span>
                        <StatusBadge statusId={item.data.to_status_id} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
