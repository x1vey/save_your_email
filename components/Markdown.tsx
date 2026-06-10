"use client";

import React from "react";

// Minimal Markdown renderer — enough for the report output (headings, bold,
// inline code, fenced code blocks, and unordered lists). Avoids a dependency.
function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Split on **bold** and `code`, keeping delimiters.
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  parts.forEach((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      nodes.push(<strong key={`${keyBase}-b${i}`}>{part.slice(2, -2)}</strong>);
    } else if (/^`[^`]+`$/.test(part)) {
      nodes.push(<code key={`${keyBase}-c${i}`}>{part.slice(1, -1)}</code>);
    } else if (part) {
      nodes.push(<React.Fragment key={`${keyBase}-t${i}`}>{part}</React.Fragment>);
    }
  });
  return nodes;
}

export default function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  let listBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length) {
      out.push(
        <ul key={`ul-${key++}`}>
          {listBuffer.map((item, j) => (
            <li key={j}>{renderInline(item, `li-${key}-${j}`)}</li>
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trim().startsWith("```")) {
      flushList();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      out.push(
        <pre key={`pre-${key++}`}>
          <code>{code.join("\n")}</code>
        </pre>
      );
      continue;
    }

    if (/^###\s+/.test(line)) {
      flushList();
      out.push(<h3 key={`h3-${key++}`}>{renderInline(line.replace(/^###\s+/, ""), `h3-${key}`)}</h3>);
    } else if (/^##\s+/.test(line)) {
      flushList();
      out.push(<h2 key={`h2-${key++}`}>{renderInline(line.replace(/^##\s+/, ""), `h2-${key}`)}</h2>);
    } else if (/^#\s+/.test(line)) {
      flushList();
      out.push(<h1 key={`h1-${key++}`}>{renderInline(line.replace(/^#\s+/, ""), `h1-${key}`)}</h1>);
    } else if (/^[-*]\s+/.test(line)) {
      listBuffer.push(line.replace(/^[-*]\s+/, ""));
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      out.push(<p key={`p-${key++}`}>{renderInline(line, `p-${key}`)}</p>);
    }
    i++;
  }
  flushList();

  return <div className="report">{out}</div>;
}
