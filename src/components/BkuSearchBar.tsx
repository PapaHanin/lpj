import React from 'react';
import { Search, X } from 'lucide-react';

interface BkuSearchBarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  placeholder?: string;
  totalMatches?: number;
  totalRows?: number;
  onClear?: () => void;
  className?: string;
}

export const BkuSearchBar: React.FC<BkuSearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  placeholder = 'Cari transaksi (uraian, no. bukti, tanggal, nominal)...',
  totalMatches,
  totalRows,
  onClear,
  className = '',
}) => {
  return (
    <div className={`relative flex items-center ${className}`}>
      <div className="relative w-full min-w-[240px] sm:w-80 md:w-96">
        <Search className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-[#180326] border border-amber-400/40 focus:border-amber-400 rounded-xl pl-9 pr-24 py-1.5 text-xs text-white placeholder-purple-300/50 shadow-inner focus:outline-none transition"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
          {searchQuery.trim() ? (
            <>
              {totalMatches !== undefined && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400 text-purple-950 shadow-xs">
                  {totalMatches}
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  if (onClear) onClear();
                }}
                className="p-1 text-purple-300 hover:text-white rounded-md hover:bg-purple-800 transition cursor-pointer"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <span className="text-[10px] text-purple-300/60 font-semibold px-1.5 py-0.5">
              Cari
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Komponen untuk menyorot kata pencarian yang cocok dengan latar kuning/amber
 */
export const HighlightMatch: React.FC<{ text: string | number | undefined | null; query: string }> = ({
  text,
  query,
}) => {
  if (text === undefined || text === null) return null;
  const str = String(text);
  if (!query || !query.trim()) return <>{str}</>;

  const trimmed = query.trim();
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = str.split(regex);

  if (parts.length === 1) return <>{str}</>;

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-amber-300 text-purple-950 px-0.5 rounded font-bold">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

/**
 * Banner notifikasi status filter pencarian aktif
 */
export const SearchActiveBanner: React.FC<{
  query: string;
  totalMatches: number;
  onClear: () => void;
  label?: string;
}> = ({ query, totalMatches, onClear, label = 'transaksi' }) => {
  if (!query.trim()) return null;

  return (
    <div className="bg-amber-400/15 border border-amber-400/40 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-200 print:hidden shadow-sm">
      <div className="flex items-center space-x-2">
        <Search className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          Menampilkan hasil pencarian untuk: <strong className="text-amber-300">"{query}"</strong> •{' '}
          <span className="font-bold text-amber-300">{totalMatches}</span> {label} ditemukan
        </span>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="px-2.5 py-1 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-purple-950 rounded-lg transition cursor-pointer shrink-0"
      >
        Tampilkan Semua
      </button>
    </div>
  );
};
