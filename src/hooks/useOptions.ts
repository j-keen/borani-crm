import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { OptionCategory, OptionItem } from '../types';

export function useOptions() {
  const [categories, setCategories] = useState<OptionCategory[]>([]);
  const [items, setItems] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOptions = useCallback(async () => {
    setLoading(true);
    try {
      const { data: catData, error: catError } = await supabase
        .from('option_categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (catError) throw catError;

      const { data: itemData, error: itemError } = await supabase
        .from('option_items')
        .select('*')
        .order('sort_order', { ascending: true });

      if (itemError) throw itemError;

      setCategories(catData || []);
      setItems(itemData || []);
    } catch (error) {
      console.error('Error fetching options:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const addItem = async (item: Omit<OptionItem, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('option_items')
        .insert(item)
        .select()
        .single();
      if (error) throw error;
      if (data) setItems((prev) => [...prev, data]);
      return data;
    } catch (error) {
      console.error('Add item error:', error);
      return null;
    }
  };

  const updateItem = async (id: string, updates: Partial<OptionItem>) => {
    try {
      const { data, error } = await supabase
        .from('option_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      if (data) setItems((prev) => prev.map((item) => (item.id === id ? data : item)));
    } catch (error) {
      console.error('Update item error:', error);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase.from('option_items').delete().eq('id', id);
      if (error) throw error;
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Delete item error:', error);
    }
  };

  const reorderItems = async (updates: { id: string; sort_order: number }[]) => {
    // Optimistic UI update
    setItems((prev) => {
      const newItems = [...prev];
      updates.forEach((u) => {
        const idx = newItems.findIndex((i) => i.id === u.id);
        if (idx !== -1) newItems[idx] = { ...newItems[idx], sort_order: u.sort_order };
      });
      return newItems;
    });

    try {
      // Upsert to reorder quickly
      // Supabase's upsert requires all columns if not doing a partial update on unique key correctly,
      // But typically we can just loop or do an RPC. For now, simple loop is fine since we rarely reorder 100 items.
      for (const update of updates) {
        await supabase
          .from('option_items')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
      }
    } catch (error) {
      console.error('Reorder error:', error);
      fetchOptions(); // revert on fail
    }
  };

  return {
    categories,
    items,
    loading,
    fetchOptions,
    addItem,
    updateItem,
    deleteItem,
    reorderItems,
  };
}
