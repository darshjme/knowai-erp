import { createContext, useContext, type ReactNode } from 'react';
import {
  Dialog,
  DialogPanel,
  DialogBackdrop,
  DialogTitle,
} from '@headlessui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Size map                                                          */
/* ------------------------------------------------------------------ */

const sizeMap = {
  sm: 'max-w-[400px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[720px]',
  xl: 'max-w-[900px]',
} as const;

type DialogSize = keyof typeof sizeMap;

/* ------------------------------------------------------------------ */
/*  Context — lets sub-components access onClose                      */
/* ------------------------------------------------------------------ */

interface DialogCtx {
  onClose: () => void;
}

const DialogContext = createContext<DialogCtx>({ onClose: () => {} });

/* ------------------------------------------------------------------ */
/*  Root                                                              */
/* ------------------------------------------------------------------ */

interface AppDialogProps {
  open: boolean;
  onClose: () => void;
  size?: DialogSize;
  children: ReactNode;
}

function AppDialogRoot({ open, onClose, size = 'md', children }: AppDialogProps) {
  return (
    <DialogContext.Provider value={{ onClose }}>
      <AnimatePresence>
        {open && (
          <Dialog static open={open} onClose={onClose} className="relative z-50">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <DialogBackdrop className="fixed inset-0 bg-[var(--bg-primary)]/80" />
            </motion.div>

            {/* Centering wrapper */}
            <div className="fixed inset-0 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={`w-full ${sizeMap[size]}`}
              >
                <DialogPanel
                  className="
                    bg-[var(--bg-card)]
                    border border-[var(--border-default)]
                    rounded-xl
                    shadow-modal
                    overflow-hidden
                  "
                >
                  {children}
                </DialogPanel>
              </motion.div>
            </div>
          </Dialog>
        )}
      </AnimatePresence>
    </DialogContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Header                                                            */
/* ------------------------------------------------------------------ */

interface HeaderProps {
  children: ReactNode;
  closeButton?: boolean;
  className?: string;
}

function Header({ children, closeButton = false, className = '' }: HeaderProps) {
  const { onClose } = useContext(DialogContext);

  return (
    <div
      className={`
        flex items-center justify-between
        px-6 py-4
        border-b border-[var(--border-default)]
        ${className}
      `}
    >
      <div className="flex-1 min-w-0">{children}</div>
      {closeButton && (
        <button
          type="button"
          onClick={onClose}
          className="
            ml-4 p-1 rounded-md
            text-[var(--text-muted)]
            hover:text-[var(--text-primary)]
            hover:bg-[var(--bg-elevated)]
            transition-colors
          "
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Title                                                             */
/* ------------------------------------------------------------------ */

interface TitleProps {
  children: ReactNode;
  className?: string;
}

function Title({ children, className = '' }: TitleProps) {
  return (
    <DialogTitle
      className={`
        text-[16px] font-semibold leading-tight
        text-[var(--text-primary)]
        font-heading
        ${className}
      `}
    >
      {children}
    </DialogTitle>
  );
}

/* ------------------------------------------------------------------ */
/*  Body                                                              */
/* ------------------------------------------------------------------ */

interface BodyProps {
  children: ReactNode;
  className?: string;
}

function Body({ children, className = '' }: BodyProps) {
  return (
    <div className={`px-6 py-4 text-[var(--text-primary)] ${className}`}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Footer                                                            */
/* ------------------------------------------------------------------ */

interface FooterProps {
  children: ReactNode;
  className?: string;
}

function Footer({ children, className = '' }: FooterProps) {
  return (
    <div
      className={`
        flex items-center justify-end gap-3
        px-6 py-4
        border-t border-[var(--border-default)]
        ${className}
      `}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Compound export                                                   */
/* ------------------------------------------------------------------ */

export const AppDialog = Object.assign(AppDialogRoot, {
  Header,
  Title,
  Body,
  Footer,
});

export default AppDialog;
