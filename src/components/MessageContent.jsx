import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";

export function MessageContent({ content }) {
  return (
    <div className="ai-message prose prose-sm max-w-none text-inherit [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-bold [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-1.5 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-background [&_pre]:p-4 [&_pre]:text-sm [&_code]:rounded [&_code]:bg-background [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:leading-relaxed [&_a]:text-primary [&_a]:underline [&_a:hover]:text-secondary">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          table({ children }) {
            return <div className="overflow-x-auto"><table>{children}</table></div>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
