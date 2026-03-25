import { HiOutlineInbox } from 'react-icons/hi2';

interface Props {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

// 빈 상태 UI 컴포넌트
export function EmptyState({
  title = '데이터가 없습니다',
  description = '아직 등록된 항목이 없습니다.',
  action,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <HiOutlineInbox className="w-12 h-12 mb-3" />
      <h3 className="text-lg font-medium text-gray-600">{title}</h3>
      <p className="mt-1 text-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
