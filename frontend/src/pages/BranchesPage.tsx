import { useState, useEffect } from 'react'
import { api } from '../api/client'
import type { Branch } from '../api/types'
import { useToastStore } from '../stores/toastStore'

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [active, setActive] = useState('')
  const [newName, setNewName] = useState('')
  const addToast = useToastStore(s => s.add)

  const load = () => {
    api.get<{branches:Branch[];active:string}>('/api/branches').then(d => { setBranches(d.branches); setActive(d.active) })
  }
  useEffect(() => { load() }, [])

  const create = async () => {
    if (!newName.trim()) return
    try { await api.post('/api/branches', {name: newName}); setNewName(''); load(); addToast(`Branch ${newName} created`) }
    catch { addToast('Failed') }
  }

  const checkout = async (name: string) => {
    try { await api.post(`/api/branches/${name}/checkout`); load(); addToast(`Switched to ${name}`) }
    catch { addToast('Failed') }
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold mb-6">Branches</h1>
      <div className="flex gap-2 mb-6">
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New branch name"
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"/>
        <button onClick={create} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-semibold">Create</button>
      </div>
      <div className="space-y-1">
        {branches.map(b => (
          <div key={b.name} onClick={() => checkout(b.name)}
            className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm ${
              b.is_active ? 'bg-cyan-500/10 text-cyan-400 font-semibold' : 'hover:bg-gray-800 text-gray-300'
            }`}>
            <span>{b.name}</span>
            {b.is_active && <span className="text-xs bg-cyan-500/20 px-2 py-0.5 rounded">active</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
