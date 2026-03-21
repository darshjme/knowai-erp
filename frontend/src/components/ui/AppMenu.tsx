import { type ReactNode, type ButtonHTMLAttributes } from 'react';
import {
  Menu,
  MenuButton,
  MenuItems,
  MenuItem,
} from '@headlessui/react';

/* ------------------------------------------------------------------ */
/*  Root                                                              */
/* ------------------------------------------------------------------ */

interface AppMenuProps {
  children: ReactNode;
  className?: string;
}

function AppMenuRoot({ children, className = '' }: AppMenuProps) {
  return (
    <Menu as="div" className={`relative inline-block text-left ${className}`}>
      {children}
    </Menu>
  );
}

/* ------------------------------------------------------------------ */
/*  Button                                                            */
/* ------------------------------------------------------------------ */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

function Button({ children, className = '', ...rest }: ButtonProps) {
  return (
    <MenuButton
      className={`
        inline-flex items-center gap-1.5
        text-[var(--text-primary)]
        ${className}
      `}
      {...rest}
    >
      {children}
    </MenuButton>
  );
}

/* ------------------------------------------------------------------ */
/*  Items                                                             */
/* ------------------------------------------------------------------ */

interface ItemsProps {
  children: ReactNode;
  anchor?: 'bottom start' | 'bottom end' | 'top start' | 'top end';
  className?: string;
}

function Items({ children, anchor = 'bottom end', className = '' }: ItemsProps) {
  return (
    <MenuItems
      transition
      anchor={anchor}
      className={`
        z-50
        mt-2 min-w-[180px]
        origin-top-right
        bg-[var(--bg-card)]
        border border-[var(--border-default)]
        rounded-lg
        shadow-elevated
        p-1
        focus:outline-none
        transition duration-150 ease-out
        data-[closed]:scale-95 data-[closed]:opacity-0
        ${className}
      `}
    >
      {children}
    </MenuItems>
  );
}

/* ------------------------------------------------------------------ */
/*  Item                                                              */
/* ------------------------------------------------------------------ */

interface ItemProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

function Item({ children, onClick, disabled = false, className = '' }: ItemProps) {
  return (
    <MenuItem disabled={disabled}>
      {({ focus }) => (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={`
            w-full flex items-center gap-2
            px-3 py-2
            text-[13px] text-left
            rounded-md
            transition-colors
            ${focus ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]' : 'text-[var(--text-primary)]'}
            ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
            ${className}
          `}
        >
          {children}
        </button>
      )}
    </MenuItem>
  );
}

/* ------------------------------------------------------------------ */
/*  Compound export                                                   */
/* ------------------------------------------------------------------ */

export const AppMenu = Object.assign(AppMenuRoot, {
  Button,
  Items,
  Item,
});

export default AppMenu;
