import { create } from 'zustand';
import { getUserTableSettings, upsertUserTableSettings, TableSettings } from '../lib/api/userSettings';

interface TableSettingsState {
  settings: Record<string, TableSettings>;
  isLoading: boolean;
  loadSettings: (pageKey: string) => Promise<void>;
  updateSettings: (pageKey: string, newSettings: TableSettings) => Promise<void>;
  resetSettings: (pageKey: string, defaultSettings: TableSettings) => Promise<void>;
}

export const useTableSettingsStore = create<TableSettingsState>((set) => ({
  settings: {},
  isLoading: false,
  loadSettings: async (pageKey) => {
    set({ isLoading: true });
    try {
      const userSettings = await getUserTableSettings(pageKey);
      if (userSettings) {
        set((state) => ({
          settings: { ...state.settings, [pageKey]: userSettings },
        }));
      }
    } catch (error) {
      console.error('Failed to load table settings', error);
    } finally {
      set({ isLoading: false });
    }
  },
  updateSettings: async (pageKey, newSettings) => {
    // Optimistic UI update
    set((state) => ({
      settings: { ...state.settings, [pageKey]: newSettings },
    }));
    try {
      await upsertUserTableSettings(pageKey, newSettings);
    } catch (error) {
      console.error('Failed to save table settings', error);
    }
  },
  resetSettings: async (pageKey, defaultSettings) => {
    set((state) => ({
       settings: { ...state.settings, [pageKey]: defaultSettings }
    }));
    await upsertUserTableSettings(pageKey, defaultSettings);
  }
}));
