import React, { useMemo } from 'react';
import { GitCompare, Plus, Minus } from 'lucide-react';

interface DiffViewerProps {
  original: string;
  modified: string;
  title?: string;
}

interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  original,
  modified,
  title = 'Сравнение версий'
}) => {
  const diff = useMemo(() => {
    return diffWords(original, modified);
  }, [original, modified]);

  const stats = useMemo(() => {
    const added = diff.filter(d => d.added).reduce((acc, d) => acc + d.value.length, 0);
    const removed = diff.filter(d => d.removed).reduce((acc, d) => acc + d.value.length, 0);
    return { added, removed };
  }, [diff]);

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-brand-green" />
          <h3 className="font-semibold text-white">{title}</h3>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1 text-green-400">
            <Plus className="w-4 h-4" />
            +{stats.added} символов
          </span>
          <span className="flex items-center gap-1 text-red-400">
            <Minus className="w-4 h-4" />
            -{stats.removed} символов
          </span>
        </div>
      </div>

      <div className="p-4 max-h-96 overflow-y-auto">
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {diff.map((part, index) => {
            if (part.added) {
              return (
                <span
                  key={index}
                  className="bg-green-500/20 text-green-300 rounded px-0.5"
                >
                  {part.value}
                </span>
              );
            }
            if (part.removed) {
              return (
                <span
                  key={index}
                  className="bg-red-500/20 text-red-300 line-through rounded px-0.5"
                >
                  {part.value}
                </span>
              );
            }
            return (
              <span key={index} className="text-slate-300">
                {part.value}
              </span>
            );
          })}
        </div>
      </div>

      <div className="p-3 border-t border-slate-700 bg-slate-900/50">
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500/20 rounded"></span>
            <span>Добавлено</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-red-500/20 rounded"></span>
            <span>Удалено</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Simple word-based diff algorithm
 */
function diffWords(oldStr: string, newStr: string): DiffPart[] {
  const oldWords = tokenize(oldStr);
  const newWords = tokenize(newStr);

  const result: DiffPart[] = [];
  let oldIndex = 0;
  let newIndex = 0;

  while (oldIndex < oldWords.length || newIndex < newWords.length) {
    if (oldIndex >= oldWords.length) {
      // Remaining new words are additions
      result.push({ value: newWords.slice(newIndex).join(''), added: true });
      break;
    }

    if (newIndex >= newWords.length) {
      // Remaining old words are deletions
      result.push({ value: oldWords.slice(oldIndex).join(''), removed: true });
      break;
    }

    if (oldWords[oldIndex] === newWords[newIndex]) {
      // Words match
      result.push({ value: oldWords[oldIndex] });
      oldIndex++;
      newIndex++;
    } else {
      // Find next matching word
      let oldMatch = -1;
      let newMatch = -1;

      for (let i = oldIndex; i < Math.min(oldIndex + 10, oldWords.length); i++) {
        for (let j = newIndex; j < Math.min(newIndex + 10, newWords.length); j++) {
          if (oldWords[i] === newWords[j]) {
            oldMatch = i;
            newMatch = j;
            break;
          }
        }
        if (oldMatch !== -1) break;
      }

      if (oldMatch === -1 || newMatch === -1) {
        // No match found, mark remaining as changed
        if (oldIndex < oldWords.length) {
          result.push({ value: oldWords[oldIndex], removed: true });
          oldIndex++;
        }
        if (newIndex < newWords.length) {
          result.push({ value: newWords[newIndex], added: true });
          newIndex++;
        }
      } else {
        // Add removed words
        if (oldMatch > oldIndex) {
          result.push({
            value: oldWords.slice(oldIndex, oldMatch).join(''),
            removed: true
          });
        }
        // Add added words
        if (newMatch > newIndex) {
          result.push({
            value: newWords.slice(newIndex, newMatch).join(''),
            added: true
          });
        }
        oldIndex = oldMatch;
        newIndex = newMatch;
      }
    }
  }

  return mergeConsecutive(result);
}

function tokenize(text: string): string[] {
  const tokens: string[] = [];
  let current = '';

  for (const char of text) {
    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      tokens.push(char);
    } else {
      current += char;
    }
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

function mergeConsecutive(parts: DiffPart[]): DiffPart[] {
  const result: DiffPart[] = [];

  for (const part of parts) {
    const last = result[result.length - 1];

    if (last && last.added === part.added && last.removed === part.removed) {
      last.value += part.value;
    } else {
      result.push({ ...part });
    }
  }

  return result;
}
