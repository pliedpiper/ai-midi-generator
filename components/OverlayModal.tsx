"use client";

import React from 'react';
import { X } from 'lucide-react';

interface OverlayModalProps {
  isOpen: boolean;
  ariaLabel: string;
  overlayAriaLabel: string;
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: React.ReactNode;
}

const OverlayModal: React.FC<OverlayModalProps> = ({
  isOpen,
  ariaLabel,
  overlayAriaLabel,
  title,
  eyebrow,
  onClose,
  children
}) => {
  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[140]">
      <button
        aria-label={overlayAriaLabel}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div className="relative z-10 flex h-full w-full items-end justify-center p-4 sm:items-center sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          className="w-full max-w-6xl overflow-hidden rounded-lg border border-surface-600 bg-surface-800 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-surface-600 px-4 py-3 sm:px-6">
            <div>
              {eyebrow ? (
                <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
                  {eyebrow}
                </p>
              ) : null}
              <h3 className="text-lg font-medium text-text-primary">{title}</h3>
            </div>

            <button
              onClick={onClose}
              className="rounded border border-surface-600 p-2 text-text-secondary transition-colors hover:border-surface-500 hover:text-text-primary"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="max-h-[82vh] overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverlayModal;
