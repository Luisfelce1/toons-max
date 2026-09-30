import { cva, type VariantProps } from 'class-variance-authority';

export const toggleGroupItemVariants = cva(
  'inline-flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 cursor-pointer select-none',
  {
    variants: {
      variant: {
        default:
          'text-muted-foreground hover:bg-accent hover:text-accent-foreground data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[selected]:shadow-sm',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground data-[selected]:bg-primary data-[selected]:text-primary-foreground',
        // RetroToons: boton de "mando a distancia". El color sale de la variable CSS
        // `--canal` que el consumidor fija en <ui-toggle-group-item>.
        channel:
          'w-full flex-col gap-1 border-[3px] border-border bg-surface text-foreground shadow data-[hover]:-translate-y-1 data-[press]:translate-y-1 data-[press]:shadow-sm data-[selected]:bg-[var(--canal)] data-[selected]:-rotate-2 data-[selected]:shadow-md',
      },
      size: {
        sm: 'h-7 px-2 text-xs',
        md: 'h-9 px-3 text-sm',
        lg: 'h-10 px-4 text-base',
        xl: 'min-h-24 min-w-24 rounded-2xl px-3 py-2 text-sm font-bold',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export type ToggleGroupItemVariants = VariantProps<typeof toggleGroupItemVariants>;
