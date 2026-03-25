"use client";

import { Toaster as Sonner, ToasterProps } from "sonner";

/** Без next-themes: стабильный светлый тостер в продуктовом UI */
const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    theme="light"
    position="top-right"
    richColors
    closeButton
    duration={4_000}
      className="toaster group"
    style={
      {
        "--normal-bg": "var(--popover)",
        "--normal-text": "var(--popover-foreground)",
        "--normal-border": "var(--border)",
      } as React.CSSProperties
    }
    toastOptions={{
      classNames: {
        toast:
          "group-[.toaster]:shadow-lg group-[.toaster]:border group-[.toaster]:bg-white group-[.toaster]:text-[var(--popover-foreground)]",
      },
    }}
    {...props}
  />
);

export { Toaster };
