import { useStatusStore } from '../../store/useStatusStore';

interface Props {
  statusId: string | null;
  optionId?: string | null;
  className?: string;
}

// 상태 뱃지 - 동적 색상 적용 pill 형태
export function StatusBadge({ statusId, optionId, className = '' }: Props) {
  const { items } = useStatusStore();
  const status = items.find((s) => s.id === statusId);
  const option = items.find((s) => s.id === optionId);

  if (!status) {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 ${className}`}>
        미지정
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
        style={{ backgroundColor: status.color }}
      >
        {status.label}
      </span>
      {option && (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border"
          style={{ borderColor: option.color, color: option.color }}
        >
          {option.label}
        </span>
      )}
    </div>
  );
}
