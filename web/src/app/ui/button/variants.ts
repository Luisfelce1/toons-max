import { cva, type VariantProps } from 'class-variance-authority';

// RetroToons: copia de Volt UI con variantes "pegatina" (borde grueso + sombra dura)
// y tamanos grandes para dedos pequenos (objetivo minimo 64px en xl / icon-xl).
const sticker =
  'border-[3px] border-border shadow data-[hover]:-translate-y-0.5 data-[press]:translate-y-1 data-[press]:shadow-sm';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-bold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2 data-[disabled]:pointer-events-none data-[disabled]:opacity-40 disabled:pointer-events-none disabled:opacity-40 cursor-pointer select-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        solid: `bg-primary text-primary-foreground ${sticker}`,
        secondary: `bg-secondary text-secondary-foreground ${sticker}`,
        success: `bg-success text-success-foreground ${sticker}`,
        destructive: `bg-destructive text-destructive-foreground ${sticker}`,
        outline: `bg-surface text-foreground ${sticker} data-[hover]:bg-muted`,
        ghost: 'data-[hover]:bg-muted data-[hover]:text-accent-foreground',
        link: 'text-foreground underline underline-offset-4 decoration-2',
      },
      size: {
        sm: 'h-10 rounded-lg px-4 text-sm',
        md: 'h-12 rounded-xl px-5 text-base',
        lg: 'h-14 rounded-2xl px-6 text-lg [&_svg]:size-6',
        xl: 'h-20 rounded-3xl px-8 text-xl [&_svg]:size-8',
        icon: 'size-12 rounded-full [&_svg]:size-6',
        'icon-xl': 'size-20 rounded-full [&_svg]:size-10',
      },
    },
    defaultVariants: {
      variant: 'solid',
      size: 'md',
    },
  }
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
