export { UiDialog } from './dialog';
export { UiDialogOverlay } from './dialog-overlay';
export { UiDialogContent } from './dialog-content';
export { UiDialogTitle } from './dialog-title';
export { UiDialogDescription } from './dialog-description';
export { UiDialogRoot } from './dialog-root';
export {
  UiDialogService,
  UiDialogRef,
  type UiDialogContext,
  type UiDialogOptions,
  type UiDialogRole,
} from './dialog-service';

/**
 * Low-level ng-primitives dialog APIs, kept for 1.x compatibility. `UiDialogService` and
 * `uiDialogRoot` cover opening dialogs without a trigger without exposing ng-primitives types.
 */
export {
  injectDialogRef,
  injectDialogState,
  NgpDialogManager,
  NgpDialogRef,
  provideDialogConfig,
  provideDialogState,
  type NgpDialogConfig,
} from 'ng-primitives/dialog';
