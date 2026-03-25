import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { StatusBadge } from './ui/StatusBadge';
import { useAppStore } from '../store/appStore';
import type { Customer } from '../types';

interface Props {
  customer: Customer;
  onClick?: () => void;
}

// 고객 카드 컴포넌트 - 모바일 리스트에서 사용
export function CustomerCard({ customer, onClick }: Props) {
  const users = useAppStore((s) => s.users);
  const assignedUser = users.find((u) => u.id === customer.assigned_to);

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900">{customer.name}</h3>
        <StatusBadge statusId={customer.status_id} />
      </div>
      <div className="space-y-1 text-sm text-gray-500">
        {customer.phone && <p>📞 {customer.phone}</p>}
        {customer.email && <p>✉️ {customer.email}</p>}
        {assignedUser && <p>👤 담당: {assignedUser.name}</p>}
        <p className="text-xs text-gray-400">
          등록일: {format(new Date(customer.created_at), 'yyyy.MM.dd', { locale: ko })}
        </p>
      </div>
    </div>
  );
}
