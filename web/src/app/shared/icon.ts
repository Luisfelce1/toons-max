import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Iconos gruesos y redondeados, pensados para que un nino los reconozca sin leer. */
const ICONS = {
  home: 'M4 11.5 12 4l8 7.5M6.5 9.5V20h11V9.5M10 20v-5h4v5',
  back: 'M15 5l-7 7 7 7',
  prev: 'M19 5v14l-10-7zM6 5v14',
  next: 'M5 5v14l10-7zM18 5v14',
  play: 'M7 4.5v15l12.5-7.5z',
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5 20 20',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5.5 11h13v9h-13zM12 14.5v2',
  close: 'M6 6l12 12M18 6 6 18',
  tv: 'M4 8h16v11H4zM8 4l4 4 4-4M17 12v.01M17 15v.01',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6',
} as const;

export type IconName = keyof typeof ICONS;

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex', 'aria-hidden': 'true' },
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      [attr.width]="size()"
      [attr.height]="size()"
      fill="none"
      stroke="currentColor"
      stroke-width="2.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      focusable="false"
    >
      <path [attr.d]="path()" [attr.fill]="filled() ? 'currentColor' : 'none'" />
    </svg>
  `,
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input<number>(24);
  readonly filled = input(false);

  protected readonly path = computed(() => ICONS[this.name()]);
}
