import { type ReactNode } from 'react';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface AccordionItem {
  key: string;
  title: string;
  content: ReactNode;
}

interface AppAccordionProps {
  items: AccordionItem[];
  defaultOpen?: string;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function AppAccordion({ items, defaultOpen, className = '' }: AppAccordionProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {items.map((item) => (
        <Disclosure
          key={item.key}
          defaultOpen={item.key === defaultOpen}
        >
          {({ open }) => (
            <div
              className="
                bg-[var(--bg-card)]
                border border-[var(--border-default)]
                rounded-lg
                overflow-hidden
              "
            >
              {/* Header */}
              <DisclosureButton
                className="
                  w-full flex items-center justify-between
                  px-4 py-3
                  text-[14px] font-medium text-left
                  text-[var(--text-primary)]
                  hover:bg-[var(--bg-elevated)]
                  transition-colors
                  cursor-pointer
                "
              >
                <span>{item.title}</span>
                <motion.span
                  animate={{ rotate: open ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown
                    size={16}
                    className="text-[var(--text-muted)]"
                  />
                </motion.span>
              </DisclosureButton>

              {/* Panel with height animation */}
              <AnimatePresence initial={false}>
                {open && (
                  <DisclosurePanel static>
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div
                        className="
                          px-4 pb-4
                          text-[13px]
                          text-[var(--text-primary)]
                          border-t border-[var(--border-default)]
                          pt-3
                        "
                      >
                        {item.content}
                      </div>
                    </motion.div>
                  </DisclosurePanel>
                )}
              </AnimatePresence>
            </div>
          )}
        </Disclosure>
      ))}
    </div>
  );
}

export default AppAccordion;
