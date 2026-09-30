import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { cn } from '../utils';

// Every part merges its `class` input over the defaults with `cn()`, so
// `<ui-card-content class="p-3">` replaces `p-6 pt-0` instead of competing with it.

@Component({
  selector: 'ui-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
  },
  template: `<ng-content />`,
})
export class UiCard {
  readonly class = input<string>('');

  protected readonly classes = computed(() =>
    cn(
      'block rounded-xl border border-border bg-surface text-surface-foreground shadow-sm',
      this.class()
    )
  );
}

@Component({
  selector: 'ui-card-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
  },
  template: `<ng-content />`,
})
export class UiCardHeader {
  readonly class = input<string>('');

  protected readonly classes = computed(() => cn('flex flex-col gap-1.5 p-6', this.class()));
}

@Component({
  selector: 'ui-card-title',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
  },
  template: `<ng-content />`,
})
export class UiCardTitle {
  readonly class = input<string>('');

  protected readonly classes = computed(() =>
    cn('block text-lg font-semibold leading-none tracking-tight', this.class())
  );
}

@Component({
  selector: 'ui-card-description',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
  },
  template: `<ng-content />`,
})
export class UiCardDescription {
  readonly class = input<string>('');

  protected readonly classes = computed(() =>
    cn('block text-sm text-muted-foreground', this.class())
  );
}

@Component({
  selector: 'ui-card-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
  },
  template: `<ng-content />`,
})
export class UiCardContent {
  readonly class = input<string>('');

  protected readonly classes = computed(() => cn('block p-6 pt-0', this.class()));
}

@Component({
  selector: 'ui-card-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
  },
  template: `<ng-content />`,
})
export class UiCardFooter {
  readonly class = input<string>('');

  protected readonly classes = computed(() => cn('flex items-center p-6 pt-0', this.class()));
}
