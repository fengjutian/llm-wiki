import { useState, useEffect } from 'react'
import { useWorkspaceStore } from '../stores/workspaceStore'
import { useToastStore } from '../stores/toastStore'

export default function WorkbenchPage() {
  const { projects, active, load, activate, createProject, removeProject } = useWorkspaceStore()
  const addToast = useToastStore(s => s.add)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')

  useEffect(() => { load() }, [load])

  const create = async () => {
    if (!name.trim()) return
    try {
      await createProject(name.trim(), desc)
      setName(''); setDesc('')
      addToast(`已创建项目「${name}」`)
    } catch {
      addToast('创建失败')
    }
  }

  const handleActivate = async (projectName: string) => {
    try {
      await activate(projectName)
      addToast(`已切换到「${projectName}」`)
      setTimeout(() => window.location.reload(), 300)
    } catch {
      addToast('切换失败')
    }
  }

  const del = async (projectName: string) => {
    if (!confirm(`确认删除「${projectName}」？此操作不会删除文件。`)) return
    try {
      await removeProject(projectName)
      addToast(`已删除「${projectName}」`)
    } catch {
      addToast('删除失败')
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">管理工作目录</h1>

      <div className="bg-gray-900 rounded-xl p-4 mb-6 space-y-2">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="项目名称"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"/>
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="描述（可选）"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"/>
        <button onClick={create}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-semibold disabled:opacity-50"
          disabled={!name.trim()}>
          创建工作目录
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          暂无工作目录，请在上方创建第一个项目。
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map(p => (
            <div key={p.name} className={`bg-gray-900 rounded-xl p-4 flex items-center justify-between ${
              p.name === active ? 'border border-cyan-500/50' : ''
            }`}>
              <div>
                <div className="font-semibold">
                  {p.name}
                  {p.name === active && <span className="text-xs text-cyan-400 ml-1">● 当前</span>}
                </div>
                <div className="text-xs text-gray-500">
                  {p.description && <span>{p.description} — </span>}
                  {p.page_count} 个页面 · {p.wiki_path}
                </div>
              </div>
              <div className="flex gap-2">
                {p.name !== active && (
                  <button onClick={() => handleActivate(p.name)}
                    className="text-xs text-cyan-400 hover:underline">切换</button>
                )}
                <button onClick={() => del(p.name)}
                  className="text-xs text-red-400 hover:underline">删除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
