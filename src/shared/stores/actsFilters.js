import { create } from 'zustand';

export const useFilterStore = create((set) => ({
  actType: 0,
  heroMethod: 0,
  navMethod: 0,
  selectedLang: "English",
  selectedDistance: "1km",
  selectedStatus: "all",
  minRating: 1.0,
  maxRating: 10.0,
  // Фильтр по расстоянию (км): null = не задан (показывать всё)
  minDistanceKm: null,
  maxDistanceKm: null,
  // Индекс выбранного диапазона в массиве locationRanges (-1 = все)
  selectedRangeIdx: -1,

  setActType: (val) => set({ actType: val }),
  setHeroMethod: (val) => set({ heroMethod: val }),
  setNavMethod: (val) => set({ navMethod: val }),
  setSelectedLang: (val) => set({ selectedLang: val }),
  setSelectedDistance: (val) => set({ selectedDistance: val }),
  setSelectedStatus: (val) => set({ selectedStatus: val }),
  setMinRating: (val) => set({ minRating: val }),
  setMaxRating: (val) => set({ maxRating: val }),
  setDistanceRange: (idx, minKm, maxKm) => set({ selectedRangeIdx: idx, minDistanceKm: minKm, maxDistanceKm: maxKm }),

  resetFilters: () => set({ 
    actType: 0, 
    heroMethod: 0, 
    navMethod: 0, 
    selectedLang: "English", 
    selectedDistance: "1km",
    selectedStatus: "all",
    minRating: 1.0, 
    maxRating: 10.0,
    minDistanceKm: null,
    maxDistanceKm: null,
    selectedRangeIdx: -1,
  }),
}));
