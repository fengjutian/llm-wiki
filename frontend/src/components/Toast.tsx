import { useToastStore } from '../stores/toastStore'

export default function Toast() {
  const { toasts, remove } = useToastStore()
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-toast-in bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-3 shadow-lg flex items-start gap-3"
        >
          <span className="flex-1 text-sm">{t.message}</span>
          {t.link && (
            <a href={t.link} className="text-cyan-600 dark:text-cyan-400 font-semibold text-sm whitespace-nowrap">
              {t.linkText || 'View'}
            </a>
          )}
          <button onClick={() => remove(t.id)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-lg leading-none">&times;</button>
        </div>
      ))}
    </div>
  )
}
