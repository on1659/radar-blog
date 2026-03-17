import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "var(--bg-primary)",
          secondary: "var(--bg-secondary)",
          tertiary: "var(--bg-tertiary)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          muted: "var(--text-muted)",
        },
        brand: {
          primary: "var(--brand-primary)",
          "primary-light": "var(--brand-primary-light)",
          "primary-dark": "var(--brand-primary-dark)",
        },
        cat: {
          commits: "#00C471",
          articles: "#3182F6",
          techlab: "#8B5CF6",
          casual: "#FF6B35",
          daily: "#06B6D4",
        },
        code: {
          bg: "var(--code-bg)",
          text: "var(--code-text)",
        },
        border: {
          DEFAULT: "var(--border)",
          light: "var(--border-light)",
        },
        card: {
          bg: "var(--card-bg)",
          hover: "var(--card-hover)",
        },
      },
      fontFamily: {
        body: ["var(--font-body)"],
        heading: ["var(--font-heading)"],
        code: ["var(--font-code)"],
      },
      fontSize: {
        "page-title": ["2.25rem", { lineHeight: "1.3", fontWeight: "800" }],
        "section-title": ["1.5rem", { lineHeight: "1.4", fontWeight: "700" }],
        "sub-heading": ["1.25rem", { lineHeight: "1.4", fontWeight: "600" }],
        body: ["1.0625rem", { lineHeight: "1.85", fontWeight: "400" }],
        "card-title": ["1.125rem", { lineHeight: "1.4", fontWeight: "600" }],
        "card-desc": ["0.9375rem", { lineHeight: "1.6", fontWeight: "400" }],
        meta: ["0.8125rem", { lineHeight: "1.4", fontWeight: "400" }],
        "code-block": ["0.875rem", { lineHeight: "1.7", fontWeight: "400" }],
        tag: ["0.75rem", { lineHeight: "1.0", fontWeight: "500" }],
      },
      maxWidth: {
        container: "1100px",
        content: "720px",
      },
      spacing: {
        18: "4.5rem",
        "section-sm": "2rem",
        "section-md": "3rem",
        "section-lg": "4rem",
      },
      transitionDuration: {
        fast: "150ms",
        base: "200ms",
        slow: "300ms",
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "720px",
            fontSize: "1.0625rem",
            lineHeight: "1.85",
            color: "var(--text-primary)",
            "--tw-prose-body": "var(--text-primary)",
            "--tw-prose-headings": "var(--text-primary)",
            "--tw-prose-lead": "var(--text-secondary)",
            "--tw-prose-links": "var(--brand-primary)",
            "--tw-prose-bold": "var(--text-primary)",
            "--tw-prose-counters": "var(--text-tertiary)",
            "--tw-prose-bullets": "var(--text-tertiary)",
            "--tw-prose-hr": "var(--border)",
            "--tw-prose-quotes": "var(--text-secondary)",
            "--tw-prose-quote-borders": "var(--brand-primary)",
            "--tw-prose-captions": "var(--text-tertiary)",
            "--tw-prose-code": "var(--text-primary)",
            "--tw-prose-pre-code": "var(--code-text)",
            "--tw-prose-pre-bg": "var(--code-bg)",
            "--tw-prose-th-borders": "var(--border)",
            "--tw-prose-td-borders": "var(--border-light)",
            "--tw-prose-invert-body": "var(--text-primary)",
            "--tw-prose-invert-headings": "var(--text-primary)",
            "--tw-prose-invert-lead": "var(--text-secondary)",
            "--tw-prose-invert-links": "var(--brand-primary)",
            "--tw-prose-invert-bold": "var(--text-primary)",
            "--tw-prose-invert-counters": "var(--text-tertiary)",
            "--tw-prose-invert-bullets": "var(--text-tertiary)",
            "--tw-prose-invert-hr": "var(--border)",
            "--tw-prose-invert-quotes": "var(--text-secondary)",
            "--tw-prose-invert-quote-borders": "var(--brand-primary)",
            "--tw-prose-invert-captions": "var(--text-tertiary)",
            "--tw-prose-invert-code": "var(--text-primary)",
            "--tw-prose-invert-pre-code": "var(--code-text)",
            "--tw-prose-invert-pre-bg": "var(--code-bg)",
            "--tw-prose-invert-th-borders": "var(--border)",
            "--tw-prose-invert-td-borders": "var(--border-light)",
            h1: {
              color: "var(--text-primary)",
              fontWeight: "800",
            },
            h2: {
              marginTop: "3rem",
              fontSize: "1.5rem",
              fontWeight: "700",
              color: "var(--text-primary)",
            },
            h3: {
              marginTop: "2rem",
              fontSize: "1.25rem",
              fontWeight: "600",
              color: "var(--text-primary)",
            },
            h4: {
              color: "var(--text-primary)",
              fontWeight: "600",
            },
            p: {
              color: "var(--text-primary)",
            },
            li: {
              color: "var(--text-primary)",
            },
            a: {
              color: "var(--brand-primary)",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
            },
            blockquote: {
              borderLeftColor: "var(--brand-primary)",
              borderLeftWidth: "3px",
              fontStyle: "italic",
              color: "var(--text-secondary)",
            },
            code: {
              backgroundColor: "var(--bg-tertiary)",
              padding: "2px 6px",
              borderRadius: "4px",
              fontWeight: "400",
              fontSize: "0.875em",
              color: "var(--text-primary)",
            },
            "code::before": { content: "none" },
            "code::after": { content: "none" },
            pre: {
              backgroundColor: "var(--code-bg)",
              borderRadius: "8px",
              padding: "1.25rem",
              color: "var(--code-text)",
            },
            "pre code": {
              color: "var(--code-text)",
            },
            img: {
              borderRadius: "8px",
            },
            strong: {
              color: "var(--text-primary)",
            },
            hr: {
              borderColor: "var(--border)",
            },
            "thead th": {
              color: "var(--text-primary)",
              borderBottomColor: "var(--border)",
            },
            "tbody td": {
              borderBottomColor: "var(--border-light)",
            },
          },
        },
      },
    },
  },
  plugins: [typography],
};

export default config;
