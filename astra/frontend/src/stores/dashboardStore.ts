import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DashboardWidget, WidgetSize } from '../types'

export type DashboardWidgetType = 'ai-status' | 'system-status' | 'system-metrics' | 'activity' | 'quick-actions'

interface DashboardState {
  widgets: DashboardWidget[]
  editMode: boolean
  setEditMode: (edit: boolean) => void
  toggleWidget: (id: DashboardWidgetType) => void
  reorderWidgets: (widgets: DashboardWidget[]) => void
  resizeWidget: (id: DashboardWidgetType, size: WidgetSize) => void
}

const defaultWidgets: DashboardWidget[] = [
  { id: 'ai-status', type: 'ai-status', title: 'AI Status', visible: true, size: 'medium', order: 0, x: 0, y: 0, w: 1, h: 1 },
  { id: 'system-status', type: 'system-status', title: 'System Status', visible: true, size: 'medium', order: 1, x: 1, y: 0, w: 1, h: 1 },
  { id: 'system-metrics', type: 'system-metrics', title: 'System Metrics', visible: true, size: 'large', order: 2, x: 0, y: 1, w: 2, h: 1 },
  { id: 'activity', type: 'activity', title: 'Activity Feed', visible: true, size: 'medium', order: 3, x: 0, y: 2, w: 1, h: 1 },
  { id: 'quick-actions', type: 'quick-actions', title: 'Quick Actions', visible: true, size: 'medium', order: 4, x: 1, y: 2, w: 1, h: 1 },
]

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      widgets: defaultWidgets,
      editMode: false,

      setEditMode: (edit) => set({ editMode: edit }),

      toggleWidget: (id) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, visible: !w.visible } : w
          ),
        })),

      reorderWidgets: (widgets) => set({ widgets }),

      resizeWidget: (id, size) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, size } : w
          ),
        })),
    }),
    {
      name: 'astra-dashboard-layout',
      partialize: (state) => ({
        widgets: state.widgets,
      }),
    }
  )
)
