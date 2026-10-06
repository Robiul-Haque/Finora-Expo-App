import { create } from 'zustand';

export type ToastType = 'info' | 'warning' | 'error' | 'success';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastState {
  currentToast: ToastMessage | null;
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  currentToast: null,
  showToast: (message: string, type: ToastType = 'warning', duration = 3500) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    set({ currentToast: { id, message, type, duration } });
  },
  hideToast: () => set({ currentToast: null }),
}));

/**
 * Global helper to notify user cleanly without crashing or using intrusive native dialogs
 */
export const notifyUser = (message: string, type: ToastType = 'warning', duration = 3500) => {
  useToastStore.getState().showToast(message, type, duration);
};
