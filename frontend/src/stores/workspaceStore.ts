import { create } from 'zustand'
import { api } from '../api/client'
import type { Project } from '../api/types'

interface WorkspaceState {
  projects: Project[]
  active: string | null
  loading: boolean
  load: () => Promise<void>
  activate: (name: string) => Promise<void>
  createProject: (name: string, desc: string) => Promise<void>
  removeProject: (name: string) => Promise<void>
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  projects: [],
  active: null,
  loading: false,

  load: async () => {
    set({ loading: true })
    try {
      const data = await api.get<{ projects: Project[]; active: string | null }>('/api/workbench/projects')
      set({ projects: data.projects, active: data.active, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  activate: async (name) => {
    try {
      await api.post(`/api/workbench/projects/${encodeURIComponent(name)}/activate`)
      const data = await api.get<{ projects: Project[]; active: string | null }>('/api/workbench/projects')
      set({ projects: data.projects, active: data.active })
    } catch {
      throw new Error('Failed to activate project')
    }
  },

  createProject: async (name, desc) => {
    await api.post('/api/workbench/projects', { name, description: desc })
    await get().load()
  },

  removeProject: async (name) => {
    await api.del(`/api/workbench/projects/${encodeURIComponent(name)}`)
    await get().load()
  },
}))
