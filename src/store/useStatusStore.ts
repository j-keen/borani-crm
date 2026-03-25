import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { StatusOption } from '../types';

interface StatusState {
  items: StatusOption[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchItems: () => Promise<void>;
  addItem: (item: Partial<StatusOption>) => Promise<void>;
  updateItem: (id: string, updates: Partial<StatusOption>) => Promise<void>;
  deleteItem: (id: string, softDelete: boolean) => Promise<void>;
  updateSortOrder: (orderedIds: string[]) => Promise<void>;
  
  // Utils
  checkUsage: (id: string) => Promise<number>;
}

export const useStatusStore = create<StatusState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  fetchItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('status_options')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      set({ items: data as StatusOption[] });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ isLoading: false });
    }
  },

  addItem: async (item) => {
    try {
      // Calculate next sort_order if not provided
      let sortOrder = item.sort_order;
      if (sortOrder === undefined) {
        const siblings = get().items.filter(i => i.parent_id === (item.parent_id || null));
        sortOrder = siblings.length > 0 ? Math.max(...siblings.map(s => s.sort_order)) + 1 : 0;
      }

      const { error } = await supabase
        .from('status_options')
        .insert({
          ...item,
          sort_order: sortOrder,
        });

      if (error) throw error;
      await get().fetchItems();
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  updateItem: async (id, updates) => {
    try {
      const { error } = await supabase
        .from('status_options')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await get().fetchItems();
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  deleteItem: async (id, softDelete) => {
    try {
      if (softDelete) {
        const { error } = await supabase
          .from('status_options')
          .update({ is_active: false })
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('status_options')
          .delete()
          .eq('id', id);
        if (error) throw error;
      }
      await get().fetchItems();
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  updateSortOrder: async (orderedIds) => {
    try {
      // Optimitic update
      const currentItems = [...get().items];
      
      const updates = orderedIds.map((id, index) => ({
        id,
        sort_order: index
      }));

      // Find original items and update their sort_order temporarily
      const updatedItems = currentItems.map(item => {
        const update = updates.find(u => u.id === item.id);
        return update ? { ...item, sort_order: update.sort_order } : item;
      }).sort((a, b) => a.sort_order - b.sort_order);

      set({ items: updatedItems });

      const { error } = await supabase
        .from('status_options')
        .upsert(updates.map(u => ({ ...currentItems.find(i => i.id === u.id), sort_order: u.sort_order })));

      if (error) {
        // roll back
        set({ items: currentItems });
        throw error;
      }
      
      await get().fetchItems();
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  checkUsage: async (id) => {
    try {
      const { count, error } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .or(`status_id.eq.${id},option_id.eq.${id}`);

      if (error) throw error;
      return count || 0;
    } catch (err: any) {
      console.error("Failed to check usage:", err);
      return 0; // fallback
    }
  }
}));
