import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";

export function WorkspaceDialogContent({
  className,
  children,
  ...props
}: ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent className={cn("workspace-dialog", className)} {...props}>
      {children}
    </DialogContent>
  );
}

export function WorkspaceDialogHandle() {
  return <div className="workspace-dialog-handle" aria-hidden="true" />;
}

export function WorkspaceDialogShell({
  className,
  ...props
}: ComponentProps<"div">) {
  return <div className={cn("workspace-dialog-shell", className)} {...props} />;
}

export function WorkspaceDialogHeader({
  className,
  ...props
}: ComponentProps<typeof DialogHeader>) {
  return <DialogHeader className={cn("workspace-dialog-header", className)} {...props} />;
}

export function WorkspaceDialogBody({
  className,
  ...props
}: ComponentProps<"div">) {
  return <div className={cn("workspace-dialog-body", className)} {...props} />;
}

export function WorkspaceDialogForm({
  className,
  ...props
}: ComponentProps<"form">) {
  return <form className={cn("workspace-dialog-form", className)} {...props} />;
}

export function WorkspaceDialogFooter({
  className,
  ...props
}: ComponentProps<typeof DialogFooter>) {
  return <DialogFooter className={cn("workspace-dialog-footer", className)} {...props} />;
}
