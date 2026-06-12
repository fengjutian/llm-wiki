import { useState, useEffect } from 'react'
import { api } from '../api/client'
import type { Project } from '../api/types'
import { useToastStore } from '../stores/toastStore'

export default function WorkbenchPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [active, setActive] = useState<string|null>(null)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const addToast = useToastStore(s => s.add)

  const load = () => {
    api.get<{projects:Project[];active:string|null}>('/api/workbench/projects').then(d => { setProjects(d.projects); setActive(d.active) })
  }
  useEffect(() => { load() }, [])

  const create = async () => {
    if (!name.trim()) return
    try { await api.post('/api/workbench/projects', {name, description: desc}); setName(''); setDesc(''); load(); addToast(`Project ${name} created`) }
    catch (e) { addToast('Failed') }
  }

  const activate = async (name: string) => {
    try { await api.post(`/api/workbench/projects/${name}/activate`); load(); addToast(`Activated ${name}`) }
    catch { addToast('Failed') }
  }

  const del = async (name: string) => {
    if (!confirm(`Delete ${name}?`)) return
    try { await api.delete(`/api/workbench/projects/${name}`); load(); addToast(`Deleted ${name}`) }
    catch { addToast('Failed') }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Workbench</h1>
      <div className="bg-gray-900 rounded-xl p-4 mb-6 space-y-2">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Project name"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"/>
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"/>
        <button onClick={create} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-semibold">Create</button>
      </div>
      <div className="space-y-2">
        {projects.map(p => (
          <div key={p.name} className={`bg-gray-900 rounded-xl p-4 flex items-center justify-between ${
            p.name === active ? 'border border-cyan-500/50' : ''
          }`}>
            <div>
              <div className="font-semibold">{p.name} {p.name === active && <span className="text-xs text-cyan-400 ml-1">active</span>}</div>
              <div className="text-xs text-gray-500">{p.description} — {p.page_count} pages</div>
            </div>
            <div className="flex gap-2">
              {p.name !== active && <button onClick={() => activate(p.name)} className="text-xs text-cyan-400 hover:underline">Activate</button>}
              <button onClick={() => del(p.name)} className="text-xs text-red-400 hover:underline">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
