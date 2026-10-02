import type { Block } from "@/content/docs/types";

/*
 * Inline markup in block text: `code` and [label](/href). Kept tiny on purpose;
 * content is authored in this repo, never user input.
 */
function inline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) out.push(<code key={i++} className="break-words">{m[1]}</code>);
    else
      out.push(
        <a key={i++} href={m[3]} {...(m[3].startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
          {m[2]}
        </a>,
      );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Blocks({ body }: { body: Block[] }) {
  return (
    <div className="prose-rc min-w-0 [overflow-wrap:anywhere]">
      {body.map((b, i) => {
        switch (b.t) {
          case "p":
            return <p key={i}>{inline(b.text)}</p>;
          case "h2":
            return <h2 key={i}>{b.text}</h2>;
          case "h3":
            return <h3 key={i}>{b.text}</h3>;
          case "ul":
            return (
              <ul key={i}>
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i}>
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it)}</li>
                ))}
              </ol>
            );
          case "code":
            return (
              <pre key={i}>
                <code>{b.text}</code>
              </pre>
            );
          case "table":
            return (
              <div key={i} className="mt-4 max-w-full overflow-x-auto">
                <table className="!mt-0 min-w-[520px]">
                  <thead>
                    <tr>
                      {b.head.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={j}>
                        {r.map((c, k) => (
                          <td key={k} className={k === 0 ? "font-mono text-[12.5px] text-ink" : "text-ink-2"}>
                            {inline(c)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "note":
            return (
              <div
                key={i}
                className={`mt-5 border-l-[3px] px-4 py-3 text-[14.5px] leading-[1.6] ${b.tone === "warn" ? "border-warn bg-warn-soft text-ink" : "border-blue bg-blue-soft text-ink"}`}
              >
                {inline(b.text)}
              </div>
            );
        }
      })}
    </div>
  );
}
