import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";

function safeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : "";
}

const components: Components = {
  a: ({ href, children }) => {
    const url = href ? safeUrl(href) : "";
    if (!url) return <span>{children}</span>;
    return (
      <a href={url} target="_blank" rel="noreferrer noopener">
        {children}
      </a>
    );
  },
  img: () => null,
};

export function MessageContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      skipHtml
      urlTransform={safeUrl}
      disallowedElements={["img", "script", "iframe", "style"]}
      unwrapDisallowed
      components={components}
    >
      {content}
    </ReactMarkdown>
  );
}
