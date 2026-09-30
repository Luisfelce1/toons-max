import {
  booleanAttribute,
  DestroyRef,
  Directive,
  effect,
  inject,
  input,
  model,
  output,
  PLATFORM_ID,
  TemplateRef,
  untracked,
  ViewContainerRef,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  UiDialogService,
  type UiDialogContext,
  type UiDialogRef,
  type UiDialogRole,
} from './dialog-service';

/**
 * A dialog whose open state belongs to your component instead of a trigger element:
 *
 * ```html
 * <button uiButton (click)="editing.set(true)">Edit</button>
 *
 * <ng-template uiDialogRoot [(open)]="editing" (closed)="onClosed($event)" let-close="close">
 *   <div uiDialogOverlay></div>
 *   <div uiDialogContent>
 *     <h2 uiDialogTitle>Edit profile</h2>
 *     …
 *     <button uiButton (click)="close('saved')">Save</button>
 *   </div>
 * </ng-template>
 * ```
 *
 * Setting `open` to `true` opens the dialog and `false` closes it. When the user closes it (Escape,
 * overlay click, `close()`), `open` becomes `false` and `closed` emits the result. Works with
 * `uiDrawerContent` as well.
 *
 * Opening and closing are deferred to a microtask: views are never created during change
 * detection (where the `effect()` runs), and nothing happens on the server. A render hook is not
 * used on purpose — the dialog's focus trap moves focus in its own `afterNextRender`, which does
 * not run when registered from inside another render hook.
 */
@Directive({
  selector: 'ng-template[uiDialogRoot]',
  exportAs: 'uiDialogRoot',
})
export class UiDialogRoot<R = unknown> {
  private readonly template = inject<TemplateRef<UiDialogContext<R>>>(TemplateRef);
  private readonly dialog = inject(UiDialogService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly viewContainerRef = inject(ViewContainerRef);

  readonly open = model(false);
  readonly role = input<UiDialogRole>('dialog');
  readonly closeOnEscape = input<boolean, unknown>(true, { transform: booleanAttribute });
  readonly closeOnClick = input<boolean, unknown>(true, { transform: booleanAttribute });
  /** Emits the close result (or `undefined`) every time the dialog closes. */
  readonly closed = output<R | undefined>();

  private ref: UiDialogRef<R> | null = null;
  private destroyed = false;

  constructor() {
    effect(() => {
      this.open();
      if (this.isBrowser) {
        untracked(() => queueMicrotask(() => this.sync()));
      }
    });

    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      const ref = this.ref;
      this.ref = null;
      void ref?.close();
    });
  }

  private sync(): void {
    if (this.destroyed) return;
    const shouldOpen = this.open();

    if (shouldOpen && !this.ref) {
      const ref = this.dialog.open<R>(this.template, {
        role: this.role(),
        closeOnEscape: this.closeOnEscape(),
        closeOnClick: this.closeOnClick(),
        viewContainerRef: this.viewContainerRef,
      });
      this.ref = ref;

      void ref.closed.then(result => {
        if (this.destroyed) return;
        if (this.ref === ref) {
          this.ref = null;
          this.open.set(false);
        }
        this.closed.emit(result);
      });
    } else if (!shouldOpen && this.ref) {
      const ref = this.ref;
      this.ref = null;
      void ref.close();
    }
  }
}
