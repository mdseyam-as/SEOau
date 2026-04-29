import React from 'react';
import { KeywordRow } from '../types';
import { BarChart2 } from 'lucide-react';

interface KeywordListProps {
  keywords: KeywordRow[];
}

export const KeywordList: React.FC<KeywordListProps> = ({ keywords }) => {
  if (keywords.length === 0) return null;

  return (
    <div className="app-dark-card p-3 sm:p-4 md:p-6 max-h-[200px] sm:max-h-[300px] md:max-h-[400px] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
        <h3 className="font-bold text-white flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base">
          <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[linear-gradient(135deg,rgba(255,76,131,0.12),rgba(255,177,192,0.08))] border border-[#ffb1c0]/20">
            <BarChart2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#ffb1c0]" />
          </div>
          Ключи ({keywords.length})
        </h3>
        <span className="text-[9px] sm:text-[10px] md:text-xs bg-white/[0.03] text-[#ab888e] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border border-[#5b3f44] uppercase tracking-[0.14em]">
          Volume
        </span>
      </div>
      <div className="overflow-y-auto flex-1 custom-scrollbar -mr-1 sm:-mr-2 pr-1 sm:pr-2">
        <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left min-w-[200px]">
            <thead className="text-[10px] sm:text-xs text-[#ab888e] uppercase bg-white/[0.03] sticky top-0 tracking-[0.14em]">
                <tr>
                <th className="px-2 sm:px-3 py-1.5 sm:py-2">Ключ</th>
                <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right">Частота</th>
                </tr>
            </thead>
            <tbody>
                {keywords.slice(0, 100).map((row, idx) => (
                <tr key={idx} className="border-b border-white/10 hover:bg-white/[0.04] transition-colors">
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 font-medium text-slate-100 truncate max-w-[80px] sm:max-w-[120px] md:max-w-[150px]" title={row.keyword}>
                    {row.keyword}
                    </td>
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-[#f7d6dc] font-mono text-[10px] sm:text-xs md:text-sm">
                    {row.frequency}
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
        {keywords.length > 100 && (
          <div className="text-center text-[10px] sm:text-xs text-[#ab888e] mt-1.5 sm:mt-2">
            + еще {keywords.length - 100}...
          </div>
        )}
      </div>
    </div>
  );
};
