import type { JSONContent } from "@tiptap/core";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const textColorClasses: Record<string, string> = {
  red: "text-rose-700 dark:text-rose-300",
  orange: "text-amber-700 dark:text-amber-300",
  green: "text-emerald-700 dark:text-emerald-300",
  blue: "text-sky-700 dark:text-sky-300",
  purple: "text-violet-700 dark:text-violet-300",
  gray: "text-slate-500 dark:text-slate-400",
};

export function RichTextRenderer({ content }: { content: JSONContent }) {
  return <div className="space-y-2">{renderChildren(content.content)}</div>;
}

export function extractPlainTextFromRichContent(content: JSONContent) {
  return collectText(content).replace(/\s+/g, " ").trim();
}

function renderNode(node: JSONContent, index: number): ReactNode {
  if (node.type === "text") return applyMarks(node.text ?? "", node.marks, index);
  if (node.type === "paragraph") return <p key={index}>{renderChildren(node.content)}</p>;
  if (node.type === "hardBreak") return <br key={index} />;
  if (node.type === "bulletList") return <ul className="list-disc space-y-1 pl-5" key={index}>{renderChildren(node.content)}</ul>;
  if (node.type === "orderedList") return <ol className="list-decimal space-y-1 pl-5" key={index}>{renderChildren(node.content)}</ol>;
  if (node.type === "listItem") return <li key={index}>{renderChildren(node.content)}</li>;

  return <span key={index}>{renderChildren(node.content)}</span>;
}

function renderChildren(content?: JSONContent[]) {
  return content?.map((node, index) => renderNode(node, index)) ?? null;
}

function applyMarks(text: string, marks: JSONContent["marks"], key: number): ReactNode {
  return (marks ?? []).reduce<ReactNode>((children, mark) => {
    if (mark.type === "bold") return <strong key={`${key}-bold`}>{children}</strong>;
    if (mark.type === "italic") return <em key={`${key}-italic`}>{children}</em>;
    if (mark.type === "underline") return <span className="underline" key={`${key}-underline`}>{children}</span>;
    if (mark.type === "strike") return <s key={`${key}-strike`}>{children}</s>;
    if (mark.type === "link") {
      const href = typeof mark.attrs?.href === "string" ? mark.attrs.href : "";
      return isSafeUrl(href) ? (
        <a
          className="font-medium text-sky-700 underline underline-offset-2 dark:text-sky-300"
          href={href}
          key={`${key}-link`}
          rel="noreferrer"
          target="_blank"
        >
          {children}
        </a>
      ) : children;
    }
    if (mark.type === "textStyle") {
      const colorName = typeof mark.attrs?.color === "string" ? mark.attrs.color : "";
      return (
        <span className={cn(textColorClasses[colorName])} key={`${key}-text-style`}>
          {children}
        </span>
      );
    }

    return children;
  }, text);
}

function collectText(node: JSONContent): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";

  return node.content?.map(collectText).join(" ") ?? "";
}

export function isSafeUrl(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:"].includes(url.protocol);
  } catch {
    return false;
  }
}
