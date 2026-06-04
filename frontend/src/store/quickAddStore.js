import { create } from 'zustand'

export const useQuickAddStore = create((set) => ({
  isOpen: false,
  defaultType: 'EXPENSE',
  defaultGoalId: '',
  open: (type = 'EXPENSE', goalId = '') => set({ isOpen: true, defaultType: type, defaultGoalId: goalId }),
  close: () => set({ isOpen: false, defaultType: 'EXPENSE', defaultGoalId: '' }),
}))
