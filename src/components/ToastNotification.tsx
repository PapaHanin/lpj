import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X, Download } from 'lucide-react';
import { useLpjStore } from '../store/lpjStore';

export const ToastNotification: React.FC = () => {
  const { toast, clearToast } = useLpjStore();

  useEffect(() => {
    if (!toast) return;

    // Auto-clear toast after 7 seconds if no action link, or 12 seconds if action link exists
    const timer = setTimeout(() => {
      clearToast();
    }, toast.actionUrl ? 12000 : 6000);

    return () => clearTimeout(timer);
  }, [toast, clearToast]);

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
  };

  const bgColors = {
    success: 'bg-[#18052b] border-emerald-500/50 shadow-emerald-950/50',
    error: 'bg-[#18052b] border-rose-500/50 shadow-rose-950/50',
    warning: 'bg-[#18052b] border-amber-500/50 shadow-amber-950/50',
    info: 'bg-[#18052b] border-sky-500/50 shadow-sky-950/50',
  };

  return (
    <div
      id="global-app-toast"
      className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-in fade-in slide-in-from-bottom-5 duration-200 print:hidden"
    >
      <div
        className={`p-4 rounded-2xl border-2 text-white shadow-2xl backdrop-blur-md flex items-start gap-3 ${bgColors[toast.type]}`}
      >
        <div className="mt-0.5">{icons[toast.type]}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-amber-300 tracking-wide uppercase">
            {toast.title}
          </p>
          <p className="text-xs text-purple-100 font-medium mt-0.5 break-words">
            {toast.message}
          </p>

          {/* Action button / Manual Download link */}
          {toast.actionUrl && (
            <div className="mt-2.5">
              <a
                href={toast.actionUrl}
                download={toast.actionDownloadName || 'dokumen.xlsx'}
                className="inline-flex items-center gap-1.5 text-xs font-black bg-gradient-to-r from-amber-400 to-yellow-400 text-purple-950 px-3 py-1.5 rounded-xl shadow-md hover:from-amber-300 hover:to-yellow-300 transition active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{toast.actionLabel || 'Unduh File'}</span>
              </a>
            </div>
          )}
        </div>
        <button
          onClick={clearToast}
          className="p-1 text-purple-300 hover:text-white rounded-lg transition"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
