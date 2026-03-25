// =============================================
// Mini CRM 타입 정의
// =============================================

export type Role = 'admin' | 'staff' | 'viewer';
export type ViewScope = 'all' | 'own';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  view_scope: ViewScope;
  created_at: string;
  updated_at: string;
}

export interface StatusOption {
  id: string;
  label: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface CustomField {
  id: string;
  field_key: string;
  field_label: string;
  field_type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  sort_order: number;
  is_active: boolean;
  options: string[];
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  assigned_to: string | null;
  status_id: string | null;
  extra_fields: Record<string, string | number | null>;
  created_at: string;
  updated_at: string;
  // 조인된 필드
  assigned_user?: User;
  status?: StatusOption;
}

export interface Memo {
  id: string;
  customer_id: string;
  content: string;
  author_id: string;
  created_at: string;
  // 조인
  author?: User;
}

export interface StatusHistory {
  id: string;
  customer_id: string;
  from_status_id: string | null;
  to_status_id: string | null;
  changed_by: string;
  created_at: string;
  // 조인
  from_status?: StatusOption;
  to_status?: StatusOption;
  changer?: User;
}
