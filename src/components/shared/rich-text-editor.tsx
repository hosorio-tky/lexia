"use client";

import { useEditor, EditorContent, ReactRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Mention from "@tiptap/extension-mention";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import {
  Bold, Italic, List, ListOrdered, Link2, Minus, Undo, Redo,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MentionList, type MentionListRef, type MentionUser } from "./mention-list";

interface RichTextEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  minHeight?: string;
  users?: MentionUser[];
  /** Si true, no muestra la barra de herramientas (para comentarios inline) */
  minimal?: boolean;
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={cn(
        "grid h-7 w-7 place-items-center rounded text-sm transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  content = "",
  onChange,
  placeholder = "Escribe aquí…",
  editable = true,
  className,
  minHeight = "120px",
  users = [],
  minimal = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
      Mention.configure({
        HTMLAttributes: { class: "mention" },
        suggestion: {
          items: ({ query }: { query: string }) =>
            users
              .filter((u) =>
                u.label.toLowerCase().includes(query.toLowerCase())
              )
              .slice(0, 8),

          render: () => {
            let component: ReactRenderer<MentionListRef>;
            let popup: TippyInstance[];

            return {
              onStart: (props) => {
                component = new ReactRenderer(MentionList, {
                  props,
                  editor: props.editor,
                });

                if (!props.clientRect) return;

                popup = tippy("body", {
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: "manual",
                  placement: "bottom-start",
                  zIndex: 9999,
                }) as TippyInstance[];
              },

              onUpdate: (props) => {
                component.updateProps(props);
                if (!props.clientRect) return;
                popup[0]?.setProps({
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                });
              },

              onKeyDown: (props) => {
                if (props.event.key === "Escape") {
                  popup[0]?.hide();
                  return true;
                }
                return component.ref?.onKeyDown(props) ?? false;
              },

              onExit: () => {
                popup[0]?.destroy();
                component.destroy();
              },
            };
          },
        },
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    immediatelyRender: false,
  });

  if (!editor) return null;

  return (
    <div className={cn("rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring", className)}>
      {/* Toolbar — solo en modo completo */}
      {editable && !minimal && (
        <div className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            title="Negrita"
          >
            <Bold className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            title="Cursiva"
          >
            <Italic className="h-3.5 w-3.5" />
          </ToolbarButton>
          <div className="mx-1 h-4 w-px bg-border" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            title="Lista"
          >
            <List className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            title="Lista numerada"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolbarButton>
          <div className="mx-1 h-4 w-px bg-border" />
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            active={false}
            title="Separador"
          >
            <Minus className="h-3.5 w-3.5" />
          </ToolbarButton>
          <div className="ml-auto flex items-center gap-0.5">
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              active={false}
              title="Deshacer"
            >
              <Undo className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              active={false}
              title="Rehacer"
            >
              <Redo className="h-3.5 w-3.5" />
            </ToolbarButton>
          </div>
        </div>
      )}

      {/* Content */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none px-3 py-2 focus:outline-none [&_.tiptap]:outline-none [&_.mention]:text-primary [&_.mention]:font-medium [&_.mention]:cursor-default"
        style={{ minHeight }}
      />
    </div>
  );
}

/** Vista de solo lectura del HTML de Tiptap */
export function RichTextView({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none text-foreground",
        "[&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5",
        "[&_hr]:my-3 [&_hr]:border-border",
        "[&_.mention]:text-primary [&_.mention]:font-medium",
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
