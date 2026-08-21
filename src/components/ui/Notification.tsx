import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Info, XCircle, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export type NotificationType = 'success' | 'info' | 'error';

interface NotificationProps {
  message: string;
  type?: NotificationType;
  onClose: () => void;
  duration?: number;
  key?: React.Key;
}

export default function Notification({ message, type = 'info', onClose, duration = 4000 }: NotificationProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    info: <Info className="w-5 h-5 text-brand-primary" />,
    error: <XCircle className="w-5 h-5 text-red-500" />
  };

  const colors = {
    success: "border-green-500/20 bg-green-500/5",
    info: "border-brand-primary/20 bg-brand-primary/5",
    error: "border-red-500/20 bg-red-500/5"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
      className={cn(
        "fixed bottom-8 right-8 z-[200] min-w-[240px] max-w-[320px] p-3 rounded-xl border backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between gap-4",
        colors[type]
      )}
    >
      <div className="flex items-center gap-3">
        {icons[type]}
        <p className="text-xs font-bold uppercase tracking-widest text-text-main line-clamp-2">
          {message}
        </p>
      </div>
      <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
        <X className="w-4 h-4 text-text-dim" />
      </button>
    </motion.div>
  );
}
