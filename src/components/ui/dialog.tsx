"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({ className, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px]" />
    <DialogPrimitive.Content className={cn("dialog-content fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-xl bg-background p-6 shadow-[0_0_0_1px_oklch(0_0_0/.08),0_24px_60px_rgba(0,0,0,.24)] outline-none dark:shadow-[0_0_0_1px_oklch(1_0_0/.12),0_24px_60px_rgba(0,0,0,.5)]", className)} {...props}>
      {children}
      <DialogPrimitive.Close className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-md text-muted-foreground transition-[scale,background-color,color] duration-150 ease-out active:scale-[0.96] hover:bg-hover hover:text-foreground"><X size={16} /></DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>;
}
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;
