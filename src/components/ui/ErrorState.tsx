import { HiOutlineExclamationTriangle } from 'react-icons/hi2';

interface Props {
  message?: string;
  onRetry?: () => void;
}

// 에러 상태 UI 컴포넌트
export function ErrorState({ message = '데이터를 불러오는 중 오류가 발생했습니다.', onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-red-400">
      <HiOutlineExclamationTriangle className="w-12 h-12 mb-3" />
      <p className="text-sm text-gray-600">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
