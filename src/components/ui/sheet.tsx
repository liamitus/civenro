"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Right-side slide-over panel built on @base-ui/react/dialog.
 *
 * Mirrors the project's existing dialog.tsx primitives but renders the popup
 * pinned to the right edge with full viewport height — the standard pattern
 * used by Linear, Notion AI, GitHub Copilot Chat.
 */

function Sheet(props: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger(props: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose(props: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] duration-150",
        "data-open:animate-in data-open:fade-in-0",
        "data-closed:animate-out data-closed:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

interface SheetContentProps extends DialogPrimitive.Popup.Props {
  width?: number;
  showCloseButton?: boolean;
}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  function SheetContent(
    { className, children, width, showCloseButton = true, style, ...props },
    ref,
  ) {
    // Width is passed as a CSS custom property so mobile breakpoints can
    // override with `w-full` — inline-style width would otherwise win on
    // specificity and the sheet would be narrower than the viewport on phones.
    const widthVar = width
      ? ({ "--sheet-width": `${width}px` } as React.CSSProperties)
      : undefined;

    return (
      <DialogPrimitive.Portal data-slot="sheet-portal">
        <SheetOverlay />
        <DialogPrimitive.Popup
          ref={ref}
          data-slot="sheet-content"
          style={{ ...widthVar, ...style }}
          className={cn(
            // Mobile: full-screen. Desktop: right-edge slide-over that
            // respects the `width` prop. `100dvh` tracks the visual viewport
            // so the input bar stays above the on-screen keyboard on iOS /
            // Android, and `inset-0` gives us the full phone screen.
            "bg-background ring-foreground/10 fixed inset-0 z-50 flex h-[100dvh] w-full flex-col shadow-2xl ring-1 outline-none",
            "sm:inset-y-0 sm:right-0 sm:left-auto sm:h-full sm:w-[var(--sheet-width,640px)] sm:max-w-[95vw] sm:min-w-[360px]",
            "duration-200",
            "data-open:animate-in data-open:slide-in-from-right",
            "data-closed:animate-out data-closed:slide-out-to-right",
            className,
          )}
          {...props}
        >
          {children}
          {showCloseButton && (
            <DialogPrimitive.Close
              data-slot="sheet-close"
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-3 right-3 z-10"
                />
              }
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    );
  },
);

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1 border-b px-5 py-4", className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "font-heading text-sm leading-none font-semibold",
        className,
      )}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-xs", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetOverlay,
  SheetTitle,
  SheetTrigger,
};
