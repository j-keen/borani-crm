import { useAppStore } from '../../store/appStore';

interface Props {
  statusId: string | null;
  className?: string;
}

// 상태 뱃지 - 동적 색상 적용 pill 형태
export function StatusBadge({ statusId, className = '' }: Props) {
  const statusOptions = useAppStore((s) => s.statusOptions);
  const status = statusOptions.find((s) => s.id === statusId);

  if (!status) {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 ${className}`}>
        미지정
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${className}`}
      style={{ backgroundColor: status.color }}
    >
      {status.label}
    </span>
  );
}
