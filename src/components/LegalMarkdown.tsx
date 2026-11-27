import { Fragment } from 'react';

function inline(text: string) {
  return text.split(/(\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^) \n]+\))/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link && (/^https?:\/\//i.test(link[2]) || /^\/(?![\\/])/.test(link[2]))) {
      return <a key={i} href={link[2]} className="underline" rel="noopener noreferrer" target="_blank">{link[1]}</a>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function LegalMarkdown({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  for (let i = 0; i < lines.length;) {
    const key = i;
    const line = lines[i++];
    if (!line.trim()) continue;
    const heading = /^#{1,6}\s+(.+)$/.exec(line);
    if (heading) {
      blocks.push(<h3 key={key} className="font-semibold">{inline(heading[1])}</h3>);
      continue;
    }
    const marker = /^([-*+]|\d+\.)\s+(.+)$/.exec(line);
    if (marker) {
      const ordered = /^\d/.test(marker[1]);
      const listPattern = ordered ? /^\d+\.\s+(.+)$/ : /^[-*+]\s+(.+)$/;
      const entries = [marker[2]];
      while (i < lines.length) {
        const item = listPattern.exec(lines[i]);
        if (!item) break;
        entries.push(item[1]);
        i++;
      }
      const List = ordered ? 'ol' : 'ul';
      blocks.push(<List key={key} className={ordered ? 'list-decimal pl-6' : 'list-disc pl-6'}>
        {entries.map((item, index) => <li key={index}>{inline(item)}</li>)}
      </List>);
      continue;
    }
    const paragraph = [line];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}|[-*+]|\d+\.)\s+/.test(lines[i])) {
      paragraph.push(lines[i++]);
    }
    blocks.push(<p key={key}>{inline(paragraph.join('\n'))}</p>);
  }
  return <div className="space-y-3 whitespace-pre-wrap break-words leading-relaxed">{blocks}</div>;
}
