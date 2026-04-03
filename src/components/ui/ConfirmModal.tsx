import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger'
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-white border border-black/10 rounded-[40px] p-8 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                variant === 'danger' ? 'bg-red-500/10 text-red-500' :
                variant === 'warning' ? 'bg-orange-500/10 text-orange-500' :
                'bg-blue-500/10 text-blue-500'
              }`}>
                <AlertCircle className="w-6 h-6" />
              </div>
              <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-xl text-black/40 hover:text-black transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-2 mb-8">
              <h2 className="text-2xl font-black tracking-tight text-black">{title}</h2>
              <p className="text-black/40 font-medium leading-relaxed">{message}</p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-4 rounded-2xl font-bold text-black bg-black/5 hover:bg-black/10 transition-all"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`flex-1 px-6 py-4 rounded-2xl font-black text-white transition-all hover:scale-105 active:scale-95 ${
                  variant === 'danger' ? 'bg-red-500 hover:bg-red-600' :
                  variant === 'warning' ? 'bg-orange-500 hover:bg-orange-600' :
                  'bg-black hover:bg-black/90'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
