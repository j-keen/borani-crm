import { supabase } from '../supabase';

export interface ColumnSetting {
  id: string;      // column identifier (e.g. 'name', 'phone', 'provider', etc)
  label: string;   // UI label
  visible: boolean;
  width: number;
  order: number;
}

export interface TableSettings {
  columns: ColumnSetting[];
}

export async function getUserTableSettings(pageKey: string): Promise<TableSettings | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_table_settings')
    .select('settings')
    .eq('user_id', user.id)
    .eq('page_key', pageKey)
    .single();

  if (error || !data) return null;
  return data.settings as TableSettings;
}

export async function upsertUserTableSettings(pageKey: string, settings: TableSettings): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('user_table_settings')
    .upsert(
      { user_id: user.id, page_key: pageKey, settings, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,page_key' }
    );

  return !error;
}
