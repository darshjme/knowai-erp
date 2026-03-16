/**
 * ConfirmDialog - SweetAlert2 wrapper for confirm/cancel dialogs.
 *
 * Usage:
 *   import { confirmDelete, confirmAction } from '../ui/ConfirmDialog';
 *
 *   const ok = await confirmDelete('Delete this project?', 'This cannot be undone.');
 *   if (ok) { ... }
 *
 *   const ok = await confirmAction({ title: 'Archive?', text: '...', confirmText: 'Archive' });
 *   if (ok) { ... }
 *
 * NOTE: Requires sweetalert2 to be installed.
 * If sweetalert2 is not available, falls back to window.confirm().
 */

let Swal = null;

async function getSwal() {
  if (Swal) return Swal;
  try {
    const mod = await import('sweetalert2');
    Swal = mod.default || mod;
    return Swal;
  } catch {
    return null;
  }
}

const BRAND = {
  primary: '#146DF7',
  danger: '#DC2626',
  nearBlack: '#10222F',
  silver: '#4C5963',
  canvas: '#FAFAFA',
};

/**
 * confirmDelete - Show a delete confirmation dialog.
 * @param {string} [title='Delete this item?']
 * @param {string} [text='This action cannot be undone.']
 * @returns {Promise<boolean>} true if confirmed
 */
export async function confirmDelete(
  title = 'Delete this item?',
  text = 'This action cannot be undone.'
) {
  const swal = await getSwal();
  if (!swal) return window.confirm(`${title}\n${text}`);

  const result = await swal.fire({
    title,
    text,
    icon: 'warning',
    iconColor: BRAND.danger,
    showCancelButton: true,
    confirmButtonText: 'Delete',
    cancelButtonText: 'Cancel',
    confirmButtonColor: BRAND.danger,
    cancelButtonColor: BRAND.silver,
    reverseButtons: true,
    focusCancel: true,
    customClass: {
      popup: 'kai-swal-popup',
      title: 'kai-swal-title',
      htmlContainer: 'kai-swal-text',
      confirmButton: 'kai-swal-btn kai-swal-btn--danger',
      cancelButton: 'kai-swal-btn kai-swal-btn--cancel',
    },
  });

  return result.isConfirmed;
}

/**
 * confirmAction - Show a generic confirmation dialog.
 * @param {Object}  options
 * @param {string}  options.title
 * @param {string}  [options.text]
 * @param {string}  [options.html]             - HTML content (overrides text)
 * @param {string}  [options.confirmText='Confirm']
 * @param {string}  [options.cancelText='Cancel']
 * @param {string}  [options.confirmColor]     - defaults to primary blue
 * @param {'warning'|'info'|'question'|'success'|'error'} [options.icon='question']
 * @returns {Promise<boolean>} true if confirmed
 */
export async function confirmAction({
  title = 'Are you sure?',
  text,
  html,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = BRAND.primary,
  icon = 'question',
} = {}) {
  const swal = await getSwal();
  if (!swal) return window.confirm(`${title}\n${text || ''}`);

  const opts = {
    title,
    icon,
    iconColor: confirmColor,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: confirmColor,
    cancelButtonColor: BRAND.silver,
    reverseButtons: true,
    customClass: {
      popup: 'kai-swal-popup',
      title: 'kai-swal-title',
      htmlContainer: 'kai-swal-text',
      confirmButton: 'kai-swal-btn',
      cancelButton: 'kai-swal-btn kai-swal-btn--cancel',
    },
  };

  if (html) {
    opts.html = html;
  } else if (text) {
    opts.text = text;
  }

  const result = await swal.fire(opts);
  return result.isConfirmed;
}

/**
 * showSuccess - Toast-like success notification.
 * @param {string} title
 * @param {string} [text]
 */
export async function showSuccess(title = 'Success!', text) {
  const swal = await getSwal();
  if (!swal) return;

  await swal.fire({
    title,
    text,
    icon: 'success',
    iconColor: '#059669',
    timer: 2000,
    timerProgressBar: true,
    showConfirmButton: false,
    toast: true,
    position: 'top-end',
    customClass: { popup: 'kai-swal-toast' },
  });
}

/**
 * showError - Toast-like error notification.
 * @param {string} title
 * @param {string} [text]
 */
export async function showError(title = 'Error', text) {
  const swal = await getSwal();
  if (!swal) return;

  await swal.fire({
    title,
    text,
    icon: 'error',
    iconColor: BRAND.danger,
    timer: 3000,
    timerProgressBar: true,
    showConfirmButton: false,
    toast: true,
    position: 'top-end',
    customClass: { popup: 'kai-swal-toast' },
  });
}
