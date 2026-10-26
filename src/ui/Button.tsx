import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const STYLES: Record<Variant, string> = {
  primary: "bg-graphite text-white hover:bg-black",
  secondary: "bg-panel text-graphite border border-graphite hover:bg-shell",
  ghost: "text-graphite hover:bg-black/5",
  danger: "bg-panel text-stamp border border-stamp hover:bg-stamp hover:text-white",
};

export function Button({
  variant = "secondary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-sm px-3.5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${STYLES[variant]} ${className}`}
      {...props}
    />
  );
}
