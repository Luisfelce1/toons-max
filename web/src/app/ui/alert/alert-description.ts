import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { cn } from '../utils';

/** Inherits the alert's text colour: muted text on a status tint would fall below 4.5:1. */
@Component({
  selector: 'ui-alert-description',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
  },
  template: `<ng-content />`,
})
export class UiAlertDescription {
  readonly class = input<string>('');

  protected readonly classes = computed(() =>
    cn('block text-sm [&_p]:leading-relaxed', this.class())
  );
}
