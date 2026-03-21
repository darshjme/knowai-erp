import { type ReactNode } from 'react';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface TabItem {
  key: string;
  label: string;
  content: ReactNode;
}

interface AppTabsProps {
  tabs: TabItem[];
  defaultTab?: string;
  className?: string;
  onChange?: (index: number) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function AppTabs({ tabs, defaultTab, className = '', onChange }: AppTabsProps) {
  const defaultIndex = defaultTab
    ? Math.max(0, tabs.findIndex((t) => t.key === defaultTab))
    : 0;

  return (
    <TabGroup defaultIndex={defaultIndex} onChange={onChange} className={className}>
      <TabList className="flex border-b border-[var(--border-subtle)]">
        {tabs.map((tab) => (
          <Tab
            key={tab.key}
            className={({ selected }) => `
              relative
              px-4 py-2.5
              text-[13px] font-medium
              outline-none
              transition-colors
              cursor-pointer
              ${
                selected
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }
            `}
          >
            {({ selected }) => (
              <>
                {tab.label}
                {/* Active underline */}
                {selected && (
                  <span
                    className="
                      absolute left-0 right-0 -bottom-px h-[2px]
                      bg-accent-purple
                      rounded-full
                    "
                  />
                )}
              </>
            )}
          </Tab>
        ))}
      </TabList>

      <TabPanels className="pt-4">
        {tabs.map((tab) => (
          <TabPanel
            key={tab.key}
            className="text-[var(--text-primary)] focus:outline-none"
          >
            {tab.content}
          </TabPanel>
        ))}
      </TabPanels>
    </TabGroup>
  );
}

export default AppTabs;
