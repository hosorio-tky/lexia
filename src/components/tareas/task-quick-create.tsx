"use client";

import { useState } from "react";
import { ClipboardPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskFormModal } from "./task-form-modal";
import type { UserProfile } from "@/types/users";
import type { Task } from "@/types/tasks";

interface TaskQuickCreateProps {
  modulo: string;
  recursoId: string;
  recursoDesc: string;
  usuarios: UserProfile[];
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  onCreated?: (task: Task) => void;
}

export function TaskQuickCreate({
  modulo,
  recursoId,
  recursoDesc,
  usuarios,
  variant = "outline",
  size = "sm",
  onCreated,
}: TaskQuickCreateProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        <ClipboardPlus className="mr-2 h-4 w-4" />
        Nueva tarea
      </Button>

      <TaskFormModal
        open={open}
        onClose={() => setOpen(false)}
        defaultModulo={modulo}
        defaultRecursoId={recursoId}
        defaultRecursoDesc={recursoDesc}
        usuarios={usuarios}
        onCreated={(task) => {
          onCreated?.(task);
          setOpen(false);
        }}
      />
    </>
  );
}
