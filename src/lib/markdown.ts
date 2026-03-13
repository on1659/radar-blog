import { compileMDX } from "next-mdx-remote/rsc";
import rehypePrettyCode from "rehype-pretty-code";
import remarkGfm from "remark-gfm";
import type { ReactElement } from "react";
import type { Root, Element, Text } from "hast";
import type { Plugin } from "unified";
import { ArtifactBlock } from "@/components/post/ArtifactBlock";

const getTextContent = (node: Element): string => {
  let text = "";
  for (const child of node.children) {
    if (child.type === "text") text += (child as Text).value;
    else if (child.type === "element") text += getTextContent(child as Element);
  }
  return text;
};

const toId = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-");

const rehypeHeadingIds: Plugin<[], Root> = () => (tree) => {
  const visit = (node: Root | Element) => {
    if ("children" in node) {
      for (const child of node.children) {
        if (child.type === "element") {
          if (/^h[1-6]$/.test(child.tagName)) {
            const text = getTextContent(child);
            child.properties = child.properties || {};
            child.properties.id = toId(text);
          }
          visit(child);
        }
      }
    }
  };
  visit(tree);
};

const preprocessArtifacts = (source: string): string => {
  // Replace ```html:artifact ... ``` with MDX component tags
  return source.replace(
    /```html:artifact\n([\s\S]*?)```/g,
    (_match, code: string) => {
      const encoded = Buffer.from(code.trim()).toString("base64");
      return `<ArtifactBlock code="${encoded}" />`;
    }
  );
};

export const renderMarkdown = async (source: string): Promise<ReactElement> => {
  const processed = preprocessArtifacts(source);

  const { content } = await compileMDX({
    source: processed,
    components: {
      ArtifactBlock,
    },
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          rehypeHeadingIds,
          [
            rehypePrettyCode,
            {
              theme: "one-dark-pro",
              keepBackground: true,
            },
          ],
        ],
      },
    },
  });

  return content;
};

export const extractHeadings = (
  content: string
): { id: string; text: string; level: number }[] => {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  const headings: { id: string; text: string; level: number }[] = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, "")
      .replace(/\s+/g, "-");
    headings.push({ id, text, level });
  }

  return headings;
};

export const calculateReadingTime = (content: string): number => {
  const charCount = content.replace(/\s/g, "").length;
  return Math.max(1, Math.ceil(charCount / 400));
};
