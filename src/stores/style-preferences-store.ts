import { create } from "zustand";

type StylePreferencesState = {
  preferences: string[];
  setPreferences: (preferences: string[]) => void;
  togglePreference: (preference: string) => void;
};

export const useStylePreferencesStore = create<StylePreferencesState>((set) => ({
  preferences: [],
  setPreferences: (preferences) => set({ preferences }),
  togglePreference: (preference) =>
    set((state) => ({
      preferences: state.preferences.includes(preference)
        ? state.preferences.filter((item) => item !== preference)
        : [...state.preferences, preference]
    }))
}));
