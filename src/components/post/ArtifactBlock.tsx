"use client";

import { useState, useRef, useEffect } from "react";
import { Code, Maximize2, Minimize2 } from "lucide-react";

export const ArtifactBlock = ({ code }: { code: string }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [height, setHeight] = useState(200);

  const html = Buffer.from(code, "base64").toString("utf-8");

  const srcdoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #212325; color: #ECECEC; }
</style>
</head>
<body>${html}
<script>
  const sendHeight = () => {
    const h = document.documentElement.scrollHeight;
    window.parent.postMessage({ type: 'artifact-height', height: h }, '*');
  };
  window.addEventListener('load', sendHeight);
  new ResizeObserver(sendHeight).observe(document.body);
</script>
</body>
</html>`;

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "artifact-height" && e.source === iframeRef.current?.contentWindow) {
        setHeight(Math.max(120, Math.min(e.data.height, 600)));
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return (
    <div className={`not-prose my-6 overflow-hidden rounded-xl border border-border ${expanded ? "fixed inset-4 z-50 bg-bg-primary shadow-2xl" : ""}`}>
      <div className="flex items-center justify-between border-b border-border bg-bg-tertiary px-4 py-2">
        <div className="flex items-center gap-2 text-xs font-medium text-text-tertiary">
          <Code size={14} />
          Interactive Artifact
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="rounded p-1 text-text-muted transition-colors hover:bg-bg-secondary hover:text-text-primary"
        >
          {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>
      <iframe
        ref={iframeRef}
        srcDoc={srcdoc}
        sandbox="allow-scripts"
        className="w-full border-0 bg-bg-secondary"
        style={{ height: expanded ? "calc(100% - 40px)" : height }}
        title="Interactive artifact"
      />
    </div>
  );
};
