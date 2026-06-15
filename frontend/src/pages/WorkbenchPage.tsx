import { useState, useEffect } from 'react'
import { useWorkspaceStore } from '../stores/workspaceStore'
import { useToastStore } from '../stores/toastStore'

export default function WorkbenchPage() {
  const { projects, active, load, activate, createProject, removeProject, renameProject } = useWorkspaceStore()
  const addToast = useToastStore(s => s.add)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')

  // Rename dialog state
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // Delete dialog state
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteFiles, setDeleteFiles] = useState(false)

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

  const openRename = (projectName: string) => {
    setRenaming(projectName)
    setRenameValue(projectName)
  }

  const submitRename = async () => {
    if (!renaming) return
    const trimmed = renameValue.trim()
    if (!trimmed) { addToast('名称不能为空'); return }
    if (trimmed === renaming) { setRenaming(null); return }
    try {
      await renameProject(renaming, trimmed)
      addToast(`已重命名为「${trimmed}」`)
      setRenaming(null)
    } catch {
      addToast('重命名失败')
    }
  }

  const openDelete = (projectName: string) => {
    setDeleting(projectName)
    setDeleteFiles(false)
  }

  const submitDelete = async () => {
    if (!deleting) return
    try {
      await removeProject(deleting, deleteFiles)
      addToast(deleteFiles ? `已删除「${deleting}」及其文件` : `已删除「${deleting}」`)
      setDeleting(null)
    } catch {
      addToast('删除失败')
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">管理工作目录</h1>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 mb-6 space-y-2">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="项目名称"
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-cyan-500"/>
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="描述（可选）"
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-cyan-500"/>
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
            <div key={p.name} className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex items-center justify-between ${
              p.name === active ? 'border-cyan-500/50' : ''
            }`}>
              <div>
                <div className="font-semibold">
                  {p.name}
                  {p.name === active && <span className="text-xs text-cyan-600 dark:text-cyan-400 ml-1">● 当前</span>}
                </div>
                <div className="text-xs text-gray-500">
                  {p.description && <span>{p.description} — </span>}
                  {p.page_count} 个页面 · {p.wiki_path}
                </div>
              </div>
              <div className="flex gap-2">
                {p.name !== active && (
                  <button onClick={() => handleActivate(p.name)}
                    className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline">切换</button>
                )}
                <button onClick={() => openRename(p.name)}
                  className="text-xs text-gray-600 dark:text-gray-400 hover:underline">重命名</button>
                <button onClick={() => openDelete(p.name)}
                  className="text-xs text-red-500 dark:text-red-400 hover:underline">删除</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rename dialog */}
      {renaming && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setRenaming(null)}>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 w-96 max-w-[90vw] space-y-3"
               onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">重命名项目</h2>
            <input value={renameValue} onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') setRenaming(null) }}
              autoFocus
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"/>
            <p className="text-xs text-gray-500">将同时重命名磁盘上的项目目录。</p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setRenaming(null)}
                className="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">取消</button>
              <button onClick={submitRename}
                className="px-3 py-1.5 text-sm font-semibold bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white">确认</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete dialog */}
      {deleting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeleting(null)}>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 w-96 max-w-[90vw] space-y-3"
               onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">删除项目「{deleting}」</h2>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={deleteFiles} onChange={e => setDeleteFiles(e.target.checked)}
                disabled={deleting === active}
                className="mt-0.5"/>
              <span>
                同时删除磁盘上的项目目录（<code className="text-xs">wiki/</code> 与 <code className="text-xs">raw/</code>）
                {deleting === active && <span className="block text-xs text-red-500 mt-1">当前项目不能删除文件，请先切换到其他项目。</span>}
              </span>
            </label>
            <p className="text-xs text-gray-500">此操作无法撤销。</p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setDeleting(null)}
                className="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">取消</button>
              <button onClick={submitDelete}
                className="px-3 py-1.5 text-sm font-semibold bg-red-600 hover:bg-red-500 rounded-lg text-white">确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
