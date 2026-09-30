import { Directive, output } from '@angular/core';
import { NgpDialogTrigger } from 'ng-primitives/dialog';

@Directive({
  selector: '[uiDialog]',
  hostDirectives: [
    {
      directive: NgpDialogTrigger,
      inputs: ['ngpDialogTrigger: uiDialog', 'ngpDialogTriggerCloseOnEscape: closeOnEscape'],
      outputs: ['ngpDialogTriggerClosed: closed'],
    },
  ],
})
export class UiDialog {
  readonly closed = output<unknown>();
}
