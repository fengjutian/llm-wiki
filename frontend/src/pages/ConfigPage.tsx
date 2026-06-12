import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useToastStore } from '../stores/toastStore'

export default function ConfigPage() {
  const [config, setConfig] = useState<Record<string,string>>({})
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState('')
  const addToast = useToastStore(s => s.add)

  useEffect(() => {
    api.get<Record<string,string>>('/api/config').then(setConfig)
  }, [])

  const save = async () => {
    setSaving(true)
    try { await api.post('/api/config', config); addToast('Config saved') }
    catch { addToast('Save failed') }
    finally { setSaving(false) }
  }

  const testConn = async () => {
    setTesting(true); setTestResult('')
    try { const r = await api.get<{ok:boolean;model:string}>('/api/config/test'); setTestResult(`OK - ${r.model}`) }
    catch (e) { setTestResult(`Failed: ${e}`) }
    finally { setTesting(false) }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Configuration</h1>
      {Object.entries(config).map(([k,v]) => (
        <div key={k} className="mb-3">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{k}</label>
          <input value={v||''} onChange={e => setConfig(p => ({...p,[k]:e.target.value}))}
            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"/>
        </div>
      ))}
      <div className="flex gap-3 mt-6">
        <button onClick={save} disabled={saving}
          className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded-lg text-sm font-semibold">
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button onClick={testConn} disabled={testing}
          className="px-6 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 rounded-lg text-sm">
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
      </div>
      {testResult && <p className={`mt-3 text-sm ${testResult.startsWith('OK')?'text-green-500 dark:text-green-400':'text-red-500 dark:text-red-400'}`}>{testResult}</p>}
    </div>
  )
}
