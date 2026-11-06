import React, { useState, useMemo, useEffect } from 'react';
import {
  Printer,
  FileSpreadsheet,
  PlusCircle,
  Pencil,
  Trash2,
  RefreshCw,
  Calendar,
  ArrowUp,
  ArrowDown,
  Calculator,
  Check,
  X,
  Sparkles,
  CheckSquare,
  Square,
  Plus,
  Settings2,
  Info,
  ShieldCheck,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useLpjStore } from '../store/lpjStore';
import { PajakRowItem, JenisPajak } from '../types';
import { formatToSlashDate } from '../utils/dateUtils';
import {
  hitungPajakDariBruto,
  filterOnlyTaxableRows,
  detectTaxForTransaction,
  generatePajakRowsFromTransactions,
  groupPajakRowsByMonthlyBooks,
  MonthlyPajakGroup,
  ComputedPajakRow,
  OFFICIAL_P2SP_TAX_PRESETS,
  DetectedTaxItem,
} from '../utils/pajakUtils';
import { triggerPrint } from '../utils/printHelper';
import { terbilangRupiah } from '../utils/terbilang';

export interface TaxEntryDraft {
  id: string;
  label: string; // e.g. 'PPN', 'PPh 4%', 'PPh 22', or custom name
  persen: number; // e.g. 11, 4, 1.5, 2, 5, etc.
  nominal: number; // Calculated or manual Rp
}

export interface CustomTaxPreset {
  id: string;
  namaMenu: string; // e.g. "PPN 11% + PPh 4%"
  items: { label: string; persen: number }[];
}

const CUSTOM_PAJAK_STORAGE_KEY = 'lpj_custom_jenis_pajak_v1';

const DEFAULT_SINGLE_TAX_OPTIONS: { label: string; persen: number }[] = [
  { label: 'PPh Pasal 4(2) (4%)', persen: 4 },
  { label: 'PPh Pasal 4(2) Kualifikasi Kecil (1,75%)', persen: 1.75 },
  { label: 'PPh Pasal 23 Sewa Alat (2%)', persen: 2 },
  { label: 'PPh 21 Tenaga Ahli (2,5%)', persen: 2.5 },
  { label: 'PPh 21 PNS Gol III (5%)', persen: 5 },
  { label: 'PPh 21 PNS Gol IV (15%)', persen: 15 },
  { label: 'PPh 21 Upah Tukang > 450rb (0,5%)', persen: 0.5 },
  { label: 'PPN (11%)', persen: 11 },
  { label: 'PPh 22 (1,5%)', persen: 1.5 },
  { label: 'Pajak Daerah (10%)', persen: 10 },
];

export const BkuPajakView: React.FC = () => {
  const {
    profile,
    transactions,
    pajakRows,
    setPajakRows,
    addPajakRow,
    updatePajakRow,
    deletePajakRow,
    movePajakRow,
    syncPajakFromTransactions,
    cleanUntaxedPajakRows,
    loadSamplePajakRows,
    openProfileModal,
    showToast,
  } = useLpjStore();

  // Filter HANYA Belanja yang Ada Pajaknya (Sesuai Permintaan User & Aturan P2SP KPP Pratama)
  const [onlyTaxableFilter, setOnlyTaxableFilter] = useState<boolean>(true);
  const [showTaxRulesGuide, setShowTaxRulesGuide] = useState<boolean>(false);

  // Modal Pilih Belanja Berpajak dari BKU
  const [isBatchSyncModalOpen, setIsBatchSyncModalOpen] = useState<boolean>(false);
  const [batchSelectedTxIds, setBatchSelectedTxIds] = useState<string[]>([]);

  // Daftar transaksi dari BKU Tunai (pengeluaran tunai) untuk dipilih langsung
  const bkuTunaiTransactions = useMemo(() => {
    const tunaiExpenses = transactions.filter(
      (t) => t.metode === 'TUNAI' && t.pengeluaran > 0
    );
    if (tunaiExpenses.length > 0) return tunaiExpenses;
    return transactions.filter((t) => t.pengeluaran > 0);
  }, [transactions]);

  // State Kotak Centang (Checkbox) untuk pilih, edit & hapus transaksi
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [bulkEditRows, setBulkEditRows] = useState<PajakRowItem[] | null>(null);
  const [bulkTanggalApply, setBulkTanggalApply] = useState<string>('');
  const [bulkNomorBuktiApply, setBulkNomorBuktiApply] = useState<string>('');
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<string[] | null>(null);

  // Bersihkan ID yang sudah tidak ada di pajakRows
  useEffect(() => {
    const validIds = new Set(pajakRows.map((r) => r.id));
    setSelectedRowIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [pajakRows]);

  // Custom Jenis Pajak Presets (disimpan di localStorage)
  const [customPresets, setCustomPresets] = useState<CustomTaxPreset[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_PAJAK_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const saveCustomPresets = (next: CustomTaxPreset[]) => {
    setCustomPresets(next);
    try {
      localStorage.setItem(CUSTOM_PAJAK_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  // Form Buat Preset Jenis Pajak Custom Baru
  const [isNewPresetOpen, setIsNewPresetOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // Modal Tambah Baris / Paket Pajak
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<'paket_otomatis' | 'baris_tunggal'>('paket_otomatis');
  const [selectedBkuTunaiTxId, setSelectedBkuTunaiTxId] = useState<string>('');
  const [formTanggal, setFormTanggal] = useState('01/08/2026');
  const [formNomorBukti, setFormNomorBukti] = useState('');
  const [formUraian, setFormUraian] = useState('Pembelian Bahan matrial Bangunan (Nota Terlampir)');
  const [formNominalBelanja, setFormNominalBelanja] = useState<number>(3000000);
  const [formJenisPajak, setFormJenisPajak] = useState<JenisPajak>('PPh Pasal 4(2)');
  const [detectedTaxHint, setDetectedTaxHint] = useState<string | null>(null);

  // Daftar Pajak yang dikenakan pada transaksi ini (bisa 1 pajak, 2 pajak sekaligus misal PPN + PPh 4%, atau lebih)
  const [taxItems, setTaxItems] = useState<TaxEntryDraft[]>([
    {
      id: 'tax-init-1',
      label: 'PPh Pasal 4(2) (4%)',
      persen: 4,
      nominal: hitungPajakDariBruto(3000000, 'PPh 4%'),
    },
  ]);

  const [formSudahDibayar, setFormSudahDibayar] = useState<boolean>(true);
  const [formTampilkanBarisBelanja, setFormTampilkanBarisBelanja] = useState<boolean>(true);

  // Single row fields
  const [singlePenerimaan, setSinglePenerimaan] = useState<number>(0);
  const [singlePengeluaran, setSinglePengeluaran] = useState<number>(0);
  const [singleIsTaxRow, setSingleIsTaxRow] = useState<boolean>(true);

  // Editing Single Row State
  const [editingRow, setEditingRow] = useState<PajakRowItem | null>(null);

  // Pilihan Tab Bulan yang ditampilkan: 'ALL' (Semua Bulan Berjalan) atau 'YYYY-MM' (Bulan Spesifik)
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('ALL');

  // Mengelompokkan baris BKU Pajak ke dalam buku bulanan sesuai dengan bulan-bulan berjalan di BKU Tunai
  const monthlyPajakGroups = useMemo(
    () => groupPajakRowsByMonthlyBooks(pajakRows, transactions, profile, onlyTaxableFilter),
    [pajakRows, transactions, profile, onlyTaxableFilter]
  );

  const groupsToRender = useMemo(() => {
    if (selectedMonthKey === 'ALL') {
      return monthlyPajakGroups;
    }
    const filtered = monthlyPajakGroups.filter((g) => g.monthKey === selectedMonthKey);
    return filtered.length > 0 ? filtered : monthlyPajakGroups;
  }, [monthlyPajakGroups, selectedMonthKey]);

  // Seluruh baris yang sedang aktif ditampilkan di layar (untuk checkbox & select all)
  const allRenderedRows = useMemo(() => {
    return groupsToRender.flatMap((g) => g.rows);
  }, [groupsToRender]);

  const totalPenerimaanPajakAll = useMemo(() => {
    return groupsToRender.reduce((sum, g) => sum + g.totalPenerimaanPajak, 0);
  }, [groupsToRender]);

  const totalPengeluaranPajakAll = useMemo(() => {
    return groupsToRender.reduce((sum, g) => sum + g.totalPengeluaranPajak, 0);
  }, [groupsToRender]);

  const latestSaldoAkhirPajak = useMemo(() => {
    if (groupsToRender.length === 0) return 0;
    return groupsToRender[groupsToRender.length - 1].saldoAkhirPajak;
  }, [groupsToRender]);

  // Helper membuat daftar taxItems dari pilihan dropdown JenisPajak
  const buildTaxItemsFromJenis = (jenis: JenisPajak, nilaiBelanja: number): TaxEntryDraft[] => {
    const base = Math.max(0, Number(nilaiBelanja) || 0);
    const ts = Date.now();

    // Cek apakah jenis adalah salah satu custom preset
    if (jenis.startsWith('CUSTOM_PRESET:')) {
      const presetId = jenis.replace('CUSTOM_PRESET:', '');
      const foundPreset = customPresets.find((p) => p.id === presetId);
      if (foundPreset && foundPreset.items.length > 0) {
        return foundPreset.items.map((item, idx) => ({
          id: `tax-${ts}-${idx}`,
          label: item.label,
          persen: item.persen,
          nominal: Math.round(base * (item.persen / 100)),
        }));
      }
    }

    const jLower = jenis.toLowerCase();

    if (jLower.includes('ppn + pph 22')) {
      return [
        { id: `tax-${ts}-1`, label: 'PPN', persen: 11, nominal: Math.round(base * 0.11) },
        { id: `tax-${ts}-2`, label: 'PPh 22', persen: 1.5, nominal: Math.round(base * 0.015) },
      ];
    }
    if (jLower.includes('ppn + pph 4%') || jLower.includes('ppn + pph 4')) {
      return [
        { id: `tax-${ts}-1`, label: 'PPN', persen: 11, nominal: Math.round(base * 0.11) },
        { id: `tax-${ts}-2`, label: 'PPh 4%', persen: 4, nominal: Math.round(base * 0.04) },
      ];
    }
    if (jLower.includes('ppn + pph 23')) {
      return [
        { id: `tax-${ts}-1`, label: 'PPN', persen: 11, nominal: Math.round(base * 0.11) },
        { id: `tax-${ts}-2`, label: 'PPh 23', persen: 2, nominal: Math.round(base * 0.02) },
      ];
    }
    if (jLower.includes('ppn + pph 21')) {
      return [
        { id: `tax-${ts}-1`, label: 'PPN', persen: 11, nominal: Math.round(base * 0.11) },
        { id: `tax-${ts}-2`, label: 'PPh 21', persen: 5, nominal: Math.round(base * 0.05) },
      ];
    }
    if (jLower.includes('1,75') || jLower.includes('1.75')) {
      return [
        {
          id: `tax-${ts}-1`,
          label: 'PPh Pasal 4(2) Kualifikasi Kecil',
          persen: 1.75,
          nominal: Math.round(base * 0.0175),
        },
      ];
    }
    if (
      jLower.includes('4%') ||
      jLower.includes('pasal 4(2)') ||
      jLower.includes('perencana') ||
      jLower.includes('pengawas') ||
      jLower.includes('konstruksi')
    ) {
      return [
        {
          id: `tax-${ts}-1`,
          label: 'PPh Pasal 4(2) (4%)',
          persen: 4,
          nominal: Math.round(base * 0.04),
        },
      ];
    }
    if (jLower.includes('pph 23') || jLower.includes('sewa')) {
      return [
        {
          id: `tax-${ts}-1`,
          label: 'PPh Pasal 23 Sewa Alat (2%)',
          persen: 2,
          nominal: Math.round(base * 0.02),
        },
      ];
    }
    if (
      jLower.includes('2,5') ||
      jLower.includes('2.5') ||
      jLower.includes('tenaga ahli') ||
      jLower.includes('bukan pegawai')
    ) {
      return [
        {
          id: `tax-${ts}-1`,
          label: 'PPh 21 Tenaga Ahli (2,5%)',
          persen: 2.5,
          nominal: Math.round(base * 0.025),
        },
      ];
    }
    if (jLower.includes('gol iv') || jLower.includes('golongan iv') || jLower.includes('15%')) {
      return [
        {
          id: `tax-${ts}-1`,
          label: 'PPh 21 PNS Gol IV (15%)',
          persen: 15,
          nominal: Math.round(base * 0.15),
        },
      ];
    }
    if (jLower.includes('gol iii') || jLower.includes('golongan iii')) {
      return [
        {
          id: `tax-${ts}-1`,
          label: 'PPh 21 PNS Gol III (5%)',
          persen: 5,
          nominal: Math.round(base * 0.05),
        },
      ];
    }
    if (jLower.includes('0,5') || jLower.includes('0.5') || jLower.includes('tukang')) {
      return [
        {
          id: `tax-${ts}-1`,
          label: 'PPh 21 Upah Tukang > 450rb (0,5%)',
          persen: 0.5,
          nominal: Math.round(base * 0.005),
        },
      ];
    }
    if (jLower.includes('pph 21')) {
      return [
        {
          id: `tax-${ts}-1`,
          label: 'PPh 21 (5%)',
          persen: 5,
          nominal: Math.round(base * 0.05),
        },
      ];
    }
    if (jLower.includes('ppn')) {
      return [
        { id: `tax-${ts}-1`, label: 'PPN (11%)', persen: 11, nominal: Math.round(base * 0.11) },
      ];
    }
    if (jLower.includes('pph 22')) {
      return [
        { id: `tax-${ts}-1`, label: 'PPh 22 (1,5%)', persen: 1.5, nominal: Math.round(base * 0.015) },
      ];
    }
    if (jLower.includes('daerah')) {
      return [
        {
          id: `tax-${ts}-1`,
          label: 'Pajak Daerah (10%)',
          persen: 10,
          nominal: Math.round(base * 0.1),
        },
      ];
    }

    // Custom: pertahankan item yang sudah ada tapi hitung ulang nominalnya
    if (taxItems.length > 0) {
      return taxItems.map((item) => ({
        ...item,
        nominal: Math.round(base * (item.persen / 100)),
      }));
    }
    return [
      { id: `tax-${ts}-1`, label: 'Pajak Custom', persen: 4, nominal: Math.round(base * 0.04) },
    ];
  };

  const handleNominalBelanjaChange = (val: number) => {
    setFormNominalBelanja(val);
    setTaxItems((prev) =>
      prev.map((item) => ({
        ...item,
        nominal: Math.round(val * ((Number(item.persen) || 0) / 100)),
      }))
    );
  };

  const handleJenisPajakChange = (jenis: JenisPajak) => {
    setFormJenisPajak(jenis);
    if (jenis !== 'Custom') {
      setTaxItems(buildTaxItemsFromJenis(jenis, formNominalBelanja));
    }
  };

  // Tambah baris pajak baru di dalam transaksi yang sama (misal sudah ada PPN, tambah PPh 4%)
  const handleAddTaxItemRow = (defaultLabel = 'PPh 4%', defaultPersen = 4) => {
    const nextItem: TaxEntryDraft = {
      id: `tax-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: defaultLabel,
      persen: defaultPersen,
      nominal: Math.round(formNominalBelanja * (defaultPersen / 100)),
    };
    setTaxItems((prev) => [...prev, nextItem]);
    setFormJenisPajak('Custom');
  };

  const handleUpdateTaxItem = (
    id: string,
    patch: Partial<Pick<TaxEntryDraft, 'label' | 'persen' | 'nominal'>>,
    recalcNominalFromPersen = false
  ) => {
    setTaxItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...patch };
        if (recalcNominalFromPersen && patch.persen !== undefined) {
          updated.nominal = Math.round(
            formNominalBelanja * ((Number(patch.persen) || 0) / 100)
          );
        }
        return updated;
      })
    );
  };

  const handleRemoveTaxItem = (id: string) => {
    setTaxItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
  };

  // Simpan kombinasi pajak saat ini sebagai Preset Jenis Pajak baru di menu dropdown
  const handleSaveCurrentAsPreset = () => {
    const trimmed = newPresetName.trim();
    if (!trimmed) {
      showToast({
        type: 'warning',
        title: 'Nama Jenis Pajak Kosong',
        message: 'Masukkan nama jenis pajak custom terlebih dahulu (misal: PPN + PPh 4%).',
      });
      return;
    }
    const newPreset: CustomTaxPreset = {
      id: `preset-${Date.now()}`,
      namaMenu: trimmed,
      items: taxItems.map((t) => ({
        label: t.label.trim() || 'Pajak',
        persen: Number(t.persen) || 0,
      })),
    };
    const updated = [...customPresets, newPreset];
    saveCustomPresets(updated);
    setFormJenisPajak(`CUSTOM_PRESET:${newPreset.id}`);
    setNewPresetName('');
    setIsNewPresetOpen(false);
    showToast({
      type: 'success',
      title: 'Jenis Pajak Custom Disimpan',
      message: `"${trimmed}" berhasil ditambahkan ke daftar menu pilihan Jenis Pajak.`,
    });
  };

  const handleDeleteCustomPreset = (presetId: string) => {
    const next = customPresets.filter((p) => p.id !== presetId);
    saveCustomPresets(next);
    if (formJenisPajak === `CUSTOM_PRESET:${presetId}`) {
      setFormJenisPajak('PPN');
      setTaxItems(buildTaxItemsFromJenis('PPN', formNominalBelanja));
    }
    showToast({
      type: 'info',
      title: 'Jenis Pajak Custom Dihapus',
      message: 'Preset pajak kustom telah dihapus dari menu pilihan.',
    });
  };

  // Saat user memilih transaksi dari BKU Tunai
  const handleSelectBkuTunaiTransaction = (txId: string) => {
    setSelectedBkuTunaiTxId(txId);
    if (!txId) {
      setDetectedTaxHint(null);
      return;
    }
    const found = transactions.find((t) => t.id === txId);
    if (!found) return;

    const cleanTgl = formatToSlashDate(found.tanggal);
    const nilai = found.pengeluaran || found.penerimaan || 0;

    // Deteksi otomatis kewajiban pajak berdasarkan aturan resmi P2SP KPP Pratama
    const detected = detectTaxForTransaction(found);

    if (detected.length > 0) {
      const first = detected[0];
      setFormTanggal(cleanTgl);
      setFormNomorBukti(found.nomorBukti || '');
      setFormUraian(found.uraian);
      setFormNominalBelanja(nilai);
      setFormJenisPajak(first.jenisPajak);
      setTaxItems(
        detected.map((d, idx) => ({
          id: `tax-dt-${Date.now()}-${idx}`,
          label: d.label,
          persen: d.persen,
          nominal: d.nominal,
        }))
      );
      setDetectedTaxHint(`✓ Transaksi Berpajak: ${first.keterangan}`);
    } else {
      // Transaksi bebas pajak (material toko biasa / upah harian <= 450rb)
      setFormTanggal(cleanTgl);
      setFormNomorBukti(found.nomorBukti || '');
      setFormUraian(found.uraian);
      setFormNominalBelanja(nilai);
      setDetectedTaxHint(
        'Perhatian Aturan P2SP: Pembelian material toko oleh P2SP swakelola bukan pemungut PPh 22 & PPN (Pajak = Rp 0). Upah tukang <= Rp 450rb/hari juga bebas PPh 21 (TER 0%). Transaksi tanpa pajak tidak perlu dicatat di BKU Pajak kecuali toko rekanan merupakan PKP.'
      );
      setFormJenisPajak('PPh Pasal 4(2)');
      setTaxItems(buildTaxItemsFromJenis('PPh Pasal 4(2)', nilai));
    }
  };

  // Jika user memilih uraian dari datalist ketik cepat
  const handleUraianInputChange = (val: string) => {
    setFormUraian(val);
    const matchedTx = bkuTunaiTransactions.find(
      (t) => t.uraian.toLowerCase() === val.trim().toLowerCase()
    );
    if (matchedTx) {
      setSelectedBkuTunaiTxId(matchedTx.id);
      setFormTanggal(formatToSlashDate(matchedTx.tanggal));
      setFormNomorBukti(matchedTx.nomorBukti || '');
      const nilai = matchedTx.pengeluaran || 0;
      setFormNominalBelanja(nilai);
      setTaxItems((prev) =>
        prev.map((item) => ({
          ...item,
          nominal: Math.round(nilai * ((Number(item.persen) || 0) / 100)),
        }))
      );
    }
  };

  // Handler Modal Pilih Belanja Berpajak dari BKU
  const handleOpenBatchSyncModal = () => {
    const expenseList = transactions.filter(
      (t) => t.metode !== 'TARIK_TUNAI' && t.jenis === 'PENGELUARAN' && t.pengeluaran > 0
    );
    // Pre-centang HANYA transaksi yang secara aturan P2SP memiliki kewajiban pajak
    const preselectedIds = expenseList
      .filter((t) => detectTaxForTransaction(t).length > 0)
      .map((t) => t.id);

    setBatchSelectedTxIds(preselectedIds);
    setIsBatchSyncModalOpen(true);
  };

  const handleToggleBatchTx = (txId: string) => {
    setBatchSelectedTxIds((prev) =>
      prev.includes(txId) ? prev.filter((id) => id !== txId) : [...prev, txId]
    );
  };

  const handleApplyBatchSync = () => {
    const selectedTxs = transactions.filter((t) => batchSelectedTxIds.includes(t.id));
    if (selectedTxs.length === 0) {
      showToast({
        type: 'warning',
        title: 'Tidak Ada Transaksi Dipilih',
        message: 'Pilih setidaknya 1 transaksi belanja yang berpajak untuk dimasukkan ke BKU Pajak.',
      });
      return;
    }
    const newRows = generatePajakRowsFromTransactions(selectedTxs);
    setPajakRows(newRows);
    setIsBatchSyncModalOpen(false);
    showToast({
      type: 'success',
      title: 'Belanja Berpajak Disinkronkan',
      message: `${selectedTxs.length} transaksi belanja berpajak berhasil dimasukkan ke Buku Pembantu Pajak.`,
    });
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDate = formatToSlashDate(formTanggal);
    const cleanUraian = formUraian.trim() || 'Pembelian Bahan matrial Bangunan (Nota Terlampir)';

    if (addMode === 'paket_otomatis') {
      // 1. Baris Pembelian / Belanja (opsional jika dicentang)
      if (formTampilkanBarisBelanja) {
        addPajakRow({
          tanggal: cleanDate,
          nomorBukti: formNomorBukti.trim(),
          uraian: cleanUraian,
          penerimaan: 0,
          pengeluaran: formNominalBelanja,
          isTaxRow: false,
        });
      }

      // 2. Loop seluruh item pajak pada transaksi ini (bisa 1 pajak, PPN + PPh 4%, PPN + PPh 22, atau banyak pajak custom)
      taxItems.forEach((item) => {
        const labelPajak = item.label.trim() || 'Pajak';
        const nominalPajak = Math.max(0, Number(item.nominal) || 0);

        // Baris Diterima Pajak
        addPajakRow({
          tanggal: cleanDate,
          nomorBukti: '',
          uraian: `Diterima ${labelPajak} ${cleanUraian}`,
          penerimaan: nominalPajak,
          pengeluaran: 0,
          jenisPajak: labelPajak,
          isTaxRow: true,
        });

        // Baris Dibayarkan Pajak (jika langsung disetor/lunas)
        if (formSudahDibayar) {
          addPajakRow({
            tanggal: cleanDate,
            nomorBukti: '',
            uraian: `Dibayarkan ${labelPajak} ${cleanUraian}`,
            penerimaan: 0,
            pengeluaran: nominalPajak,
            jenisPajak: labelPajak,
            isTaxRow: true,
          });
        }
      });

      const summaryLabels = taxItems.map((t) => `${t.label} (${t.persen}%)`).join(' + ');
      showToast({
        type: 'success',
        title: 'Transaksi Pajak Ditambahkan',
        message: `Berhasil menambahkan pajak [${summaryLabels}] untuk "${cleanUraian}" (${cleanDate}).`,
      });
    } else {
      addPajakRow({
        tanggal: cleanDate,
        nomorBukti: formNomorBukti.trim(),
        uraian: cleanUraian,
        penerimaan: singlePenerimaan,
        pengeluaran: singlePengeluaran,
        isTaxRow: singleIsTaxRow,
      });
      showToast({
        type: 'success',
        title: 'Baris BKU Pajak Ditambahkan',
        message: `Baris "${cleanUraian}" berhasil ditambahkan ke Buku Pembantu Pajak.`,
      });
    }

    setIsAddModalOpen(false);
  };

  // Fungsi Kotak Centang (Checkbox)
  // Fungsi Kotak Centang (Checkbox)
  const selectableRows = useMemo(
    () => allRenderedRows.filter((r) => !r.isInitialRow),
    [allRenderedRows]
  );

  const isAllSelected =
    selectableRows.length > 0 && selectedRowIds.length === selectableRows.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(selectableRows.map((r) => r.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleOpenEditSelected = () => {
    if (selectedRowIds.length === 0) return;
    if (selectedRowIds.length === 1) {
      const target = pajakRows.find((r) => r.id === selectedRowIds[0]);
      if (target) setEditingRow({ ...target });
      return;
    }
    const selectedItems = pajakRows
      .filter((r) => selectedRowIds.includes(r.id))
      .map((r) => ({ ...r }));
    setBulkTanggalApply('');
    setBulkNomorBuktiApply('');
    setBulkEditRows(selectedItems);
  };

  const handleSaveBulkEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkEditRows) return;
    bulkEditRows.forEach((row) => {
      updatePajakRow(row.id, {
        tanggal: formatToSlashDate(row.tanggal),
        nomorBukti: row.nomorBukti,
        uraian: row.uraian,
        penerimaan: Number(row.penerimaan) || 0,
        pengeluaran: Number(row.pengeluaran) || 0,
        isTaxRow: row.isTaxRow,
      });
    });
    const count = bulkEditRows.length;
    setBulkEditRows(null);
    setSelectedRowIds([]);
    showToast({
      type: 'success',
      title: 'Edit Massal Berhasil',
      message: `${count} baris transaksi BKU Pajak yang dicentang berhasil diperbarui.`,
    });
  };

  const handleApplyBulkFieldToDraft = (field: 'tanggal' | 'nomorBukti', value: string) => {
    if (!bulkEditRows) return;
    setBulkEditRows(
      bulkEditRows.map((r) => ({
        ...r,
        [field]: value,
      }))
    );
  };

  const handleConfirmDeleteExecute = () => {
    if (!confirmDeleteIds || confirmDeleteIds.length === 0) return;
    const count = confirmDeleteIds.length;
    confirmDeleteIds.forEach((id) => deletePajakRow(id));
    setSelectedRowIds((prev) => prev.filter((id) => !confirmDeleteIds.includes(id)));
    setConfirmDeleteIds(null);
    showToast({
      type: 'info',
      title: 'Baris Pajak Dihapus',
      message: `${count} baris pada Buku Pembantu Pajak berhasil dihapus.`,
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;
    updatePajakRow(editingRow.id, {
      tanggal: formatToSlashDate(editingRow.tanggal),
      nomorBukti: editingRow.nomorBukti,
      uraian: editingRow.uraian,
      penerimaan: Number(editingRow.penerimaan) || 0,
      pengeluaran: Number(editingRow.pengeluaran) || 0,
      isTaxRow: editingRow.isTaxRow,
    });
    setEditingRow(null);
    showToast({
      type: 'success',
      title: 'Baris Pajak Diperbarui',
      message: 'Perubahan data pada Buku Pembantu Pajak berhasil disimpan.',
    });
  };

  const handleExportExcelPajak = () => {
    const wb = XLSX.utils.book_new();

    groupsToRender.forEach((group) => {
      const rowsData =
        group.rows.length > 0
          ? group.rows.map((r) => [
              r.noUrut,
              r.tanggalFormatted,
              r.nomorBukti || '',
              r.uraian,
              r.penerimaan > 0 ? `Rp ${r.penerimaan.toLocaleString('id-ID')}` : 'Rp -',
              r.pengeluaran > 0 ? `Rp ${r.pengeluaran.toLocaleString('id-ID')}` : 'Rp -',
              r.saldo > 0 ? `Rp ${r.saldo.toLocaleString('id-ID')}` : 'Rp -',
            ])
          : [
              [
                '-',
                group.tanggalTutupBuku,
                '-',
                `Nihil - Tidak terdapat transaksi pemotongan dan penyetoran pajak pada periode ${group.label}`,
                'Rp -',
                'Rp -',
                'Rp -',
              ],
            ];

      const aoa: (string | number)[][] = [
        [profile.namaSekolah],
        ['BUKU KAS UMUM'],
        ['BUKU PEMBANTU PAJAK'],
        [`BULAN : ${group.label.toUpperCase()}`],
        [],
        ['Kepala Sekolah', `: ${profile.namaKepalaSekolah}`],
        ['Bendahara Pengeluaran', `: ${profile.namaBendahara}`],
        [],
        [
          'No Urut',
          'Tanggal',
          'Nomor Bukti',
          'Uraian',
          'Penerimaan Rp.',
          'Pengeluaran Rp.',
          'Saldo Rp.',
        ],
        ...rowsData,
        [
          '',
          '',
          '',
          `JUMLAH PAJAK BULAN ${group.monthName.toUpperCase()}`,
          group.totalPenerimaanPajak > 0
            ? `Rp ${group.totalPenerimaanPajak.toLocaleString('id-ID')}`
            : 'Rp -',
          group.totalPengeluaranPajak > 0
            ? `Rp ${group.totalPengeluaranPajak.toLocaleString('id-ID')}`
            : 'Rp -',
          group.saldoAkhirPajak > 0
            ? `Rp ${group.saldoAkhirPajak.toLocaleString('id-ID')}`
            : 'Rp -',
        ],
        [],
        [
          `Pada hari ini : ${group.tanggalTutupBuku} Buku Pembantu Pajak ditutup dengan posisi saldo pajak sebesar : Rp ${group.saldoAkhirPajak.toLocaleString('id-ID')} (${group.saldoAkhirPajak === 0 ? 'Nihil' : terbilangRupiah(group.saldoAkhirPajak)})`,
        ],
        [],
        [
          'Mengetahui,',
          '',
          '',
          'Ketua P2SP',
          '',
          `${profile.tempatPelunasan || 'Palasa'}, ${group.tanggalTutupBuku}`,
          '',
        ],
        [
          `Kepala ${profile.namaSekolah}`,
          '',
          '',
          '',
          '',
          'Bendahara',
          '',
        ],
        [],
        [],
        [],
        [
          profile.namaKepalaSekolah,
          '',
          '',
          profile.namaKetuaP2S || profile.namaPanitia || 'Ketua P2SP',
          '',
          profile.namaBendahara,
          '',
        ],
        [
          `NIP. ${profile.nipKepalaSekolah}`,
          '',
          '',
          '-',
          '',
          `NIP. ${profile.nipBendahara}`,
          '',
        ],
      ];

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } },
      ];
      ws['!cols'] = [
        { wch: 9 },
        { wch: 13 },
        { wch: 15 },
        { wch: 46 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
      ];

      const sheetName = `Pajak ${group.monthName} ${group.year}`.replace(/[\\/?*:[\]]/g, '').substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    const safeSchool = profile.namaSekolah.replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(wb, `BKU_PAJAK_${safeSchool}_SEMUA_BULAN.xlsx`);
  };

  return (
    <div className="space-y-4 pb-16">
      {/* Top Action Ribbon - Hidden in Print */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#220738] p-4 rounded-2xl border border-amber-400/30 text-white shadow-lg print:hidden">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
              Buku Pembantu Pajak (BKU Pajak)
            </h2>
            <span className="bg-amber-400 text-purple-950 text-[11px] font-black px-2 py-0.5 rounded-md shadow-xs">
              Format Resmi Gambar (7 Kolom + 3 TTD)
            </span>
          </div>
          <p className="text-xs text-purple-200/90 mt-0.5">
            Centang kotak pada baris tabel untuk mengedit atau menghapus beberapa transaksi sekaligus. Mendukung kombinasi multi-pajak & kustomisasi tarif pajak sendiri.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {monthlyPajakGroups.length > 1 && (
            <div className="flex items-center gap-1 bg-purple-950/80 p-1 rounded-xl border border-amber-400/30">
              <button
                type="button"
                onClick={() => setSelectedMonthKey('ALL')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedMonthKey === 'ALL'
                    ? 'bg-amber-400 text-purple-950 shadow-sm'
                    : 'text-purple-200 hover:bg-purple-800'
                }`}
              >
                Semua Bulan ({monthlyPajakGroups.length})
              </button>
              {monthlyPajakGroups.map((g) => (
                <button
                  key={g.monthKey}
                  type="button"
                  onClick={() => setSelectedMonthKey(g.monthKey)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedMonthKey === g.monthKey
                      ? 'bg-amber-400 text-purple-950 shadow-sm'
                      : 'text-purple-200 hover:bg-purple-800'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => {
              setAddMode('paket_otomatis');
              if (selectedMonthKey !== 'ALL') {
                const foundG = monthlyPajakGroups.find((g) => g.monthKey === selectedMonthKey);
                if (foundG) {
                  const mNum = String(foundG.monthKey.split('-')[1]).padStart(2, '0');
                  setFormTanggal(`01/${mNum}/${foundG.year}`);
                }
              }
              setIsAddModalOpen(true);
            }}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-purple-950 text-xs font-black px-3.5 py-2 rounded-xl shadow-md transition active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-purple-950" />
            <span>+ Tambah Pajak / Belanja</span>
          </button>

          <button
            onClick={() => {
              syncPajakFromTransactions();
              showToast({
                type: 'success',
                title: 'Belanja Berpajak Disinkronkan',
                message:
                  'Hanya transaksi belanja yang dikenai pajak (sesuai aturan P2SP) yang dimasukkan ke Buku Pembantu Pajak.',
              });
            }}
            className="flex items-center space-x-1.5 bg-purple-900/80 hover:bg-purple-800 text-amber-300 border border-amber-400/30 text-xs font-bold px-3 py-2 rounded-xl transition active:scale-95 cursor-pointer"
            title="Otomatis masukkan belanja berpajak (Perencana/Pengawas, Sewa Alat, Fasilitator, dll.)"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span>Sinkron Belanja Berpajak</span>
          </button>

          <button
            onClick={handleOpenBatchSyncModal}
            className="flex items-center space-x-1.5 bg-purple-900/80 hover:bg-purple-800 text-amber-300 border border-amber-400/30 text-xs font-bold px-3 py-2 rounded-xl transition active:scale-95 cursor-pointer"
            title="Pilih langsung transaksi belanja dari BKU Tunai untuk dimasukkan ke BKU Pajak"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pilih Belanja dari BKU</span>
          </button>

          <button
            onClick={() => {
              cleanUntaxedPajakRows();
              showToast({
                type: 'info',
                title: 'Belanja Tanpa Pajak Disingkirkan',
                message: 'Semua transaksi belanja yang tidak memiliki potongan pajak telah dibersihkan dari BKU Pajak.',
              });
            }}
            className="flex items-center space-x-1.5 bg-purple-900/80 hover:bg-purple-800 text-rose-300 border border-rose-500/40 text-xs font-bold px-3 py-2 rounded-xl transition active:scale-95 cursor-pointer"
            title="Singkirkan transaksi belanja yang pajaknya Rp 0"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Bersihkan Tanpa Pajak</span>
          </button>

          <button
            onClick={() => {
              loadSamplePajakRows();
              showToast({
                type: 'info',
                title: 'Contoh Gambar Dimuat',
                message: 'Tabel BKU Pajak diatur sesuai contoh format resmi.',
              });
            }}
            className="flex items-center space-x-1.5 bg-purple-900/80 hover:bg-purple-800 text-purple-200 border border-purple-700 text-xs font-semibold px-3 py-2 rounded-xl transition active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Contoh Resmi</span>
          </button>

          <button
            onClick={openProfileModal}
            className="flex items-center space-x-1 bg-purple-900/80 hover:bg-purple-800 text-amber-300 border border-amber-400/30 text-xs font-bold px-3 py-2 rounded-xl transition active:scale-95 cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Pengaturan Kop</span>
          </button>

          <button
            onClick={handleExportExcelPajak}
            className="flex items-center space-x-1.5 bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 border border-emerald-600/50 text-xs font-bold px-3 py-2 rounded-xl transition active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => triggerPrint('Buku Pembantu Pajak (BKU Pajak)')}
            className="flex items-center space-x-1.5 bg-purple-900/80 hover:bg-purple-800 text-purple-200 border border-purple-700 text-xs font-bold px-3 py-2 rounded-xl transition active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-sky-400" />
            <span>Cetak BKU Pajak</span>
          </button>
        </div>
      </div>

      {/* Panduan Perpajakan P2SP Swakelola Revitalisasi Sekolah - Materi KPP Pratama Palu */}
      <div className="bg-gradient-to-r from-purple-950/95 via-purple-900/85 to-[#240638] border border-amber-400/40 rounded-2xl p-4 text-white shadow-md print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-purple-950 flex items-center justify-center font-black shrink-0 shadow-sm">
              <ShieldCheck className="w-5 h-5 text-purple-950" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black text-amber-300">
                  Penerapan Pajak P2SP (Materi KPP Pratama Palu)
                </span>
                <span className="bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-black px-2 py-0.5 rounded-full">
                  Hanya Belanja yang Ada Pajak
                </span>
              </div>
              <p className="text-[11.5px] text-purple-200/90 mt-0.5">
                P2SP <strong>Bukan Pemungut PPh 22 &amp; PPN</strong> belanja material toko swakelola. Upah tukang &le; Rp 450rb/hari <strong>Bebas PPh 21 (TER 0%)</strong>. Hanya transaksi kena pajak yang dicatat di Buku Pembantu Pajak.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOnlyTaxableFilter((v) => !v)}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                onlyTaxableFilter
                  ? 'bg-amber-400 text-purple-950 border-amber-500 font-black shadow-xs'
                  : 'bg-purple-900/80 text-purple-200 border-purple-700'
              }`}
              title="Aktifkan untuk menyembunyikan semua transaksi yang pajaknya Rp 0"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{onlyTaxableFilter ? '✓ Filter: Hanya Belanja Berpajak' : 'Tampilkan Semua Baris'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTaxRulesGuide((v) => !v)}
              className="flex items-center gap-1 text-xs font-bold text-amber-300 hover:text-amber-200 bg-purple-950/80 border border-amber-400/30 px-3 py-1.5 rounded-xl transition cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-amber-400" />
              <span>{showTaxRulesGuide ? 'Tutup Rincian' : 'Rincian Aturan Pajak'}</span>
              {showTaxRulesGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {showTaxRulesGuide && (
          <div className="mt-3.5 pt-3.5 border-t border-purple-800/80 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-purple-950/70 border border-purple-800 rounded-xl p-3">
              <p className="font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                1. Belanja Material Swakelola (Slide 15 &amp; 32)
              </p>
              <p className="text-purple-200/90 text-[11px] leading-relaxed">
                P2SP Swakelola <strong>BUKAN Pemungut PPh 22 dan BUKAN Pemungut PPN</strong>. Pembelian semen, pasir, batu kali, kayu, APD, dll. tidak dipungut pajak oleh P2SP (Pajak = Rp 0). Maka <strong>TIDAK DIMASUKKAN</strong> ke Buku Pembantu Pajak.
              </p>
            </div>
            <div className="bg-purple-950/70 border border-purple-800 rounded-xl p-3">
              <p className="font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                2. Upah Tukang Harian (Slide 21 &amp; 26)
              </p>
              <p className="text-purple-200/90 text-[11px] leading-relaxed">
                Upah harian &le; Rp 450.000/hari dikenakan <strong>TER Harian 0% (PPh 21 = Rp 0 / Nihil)</strong>. Upah tukang swakelola sekolah rata-rata Rp 120rb - Rp 250rb/hari sehingga <strong>BEBAS PAJAK</strong> dan tidak dicatat di Buku Pembantu Pajak.
              </p>
            </div>
            <div className="bg-purple-950/70 border border-purple-800 rounded-xl p-3">
              <p className="font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                3. Belanja yang WAJIB Masuk BKU Pajak
              </p>
              <ul className="text-purple-200/90 text-[11px] space-y-1 list-disc list-inside">
                <li><strong>PPh Final 4(2) (4%):</strong> Jasa Perencana, Pengawas &amp; Borongan Fisik (Slide 45).</li>
                <li><strong>PPh 23 (2%):</strong> Sewa Alat / Molen / Angkutan (Slide 33-35).</li>
                <li><strong>PPh 21 (2,5%):</strong> Tenaga Ahli / Fasilitator Non-PNS (Slide 27).</li>
                <li><strong>PPh 21 (5% / 15%):</strong> Honorarium PNS Gol III / Gol IV (Slide 28).</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Banner Informasi Seluruh Bulan Berjalan Sesuai BKU Tunai */}
      {monthlyPajakGroups.length > 1 && (
        <div className="bg-amber-50 border-2 border-amber-300/80 rounded-2xl p-3.5 text-slate-900 flex items-center justify-between gap-3 shadow-xs print:hidden">
          <div className="flex items-center gap-2.5 text-xs">
            <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold text-purple-950">
                Buku Pembantu Pajak Mengikuti Seluruh Bulan Berjalan di BKU Tunai:
              </span>{' '}
              <span className="text-purple-900">
                Tiap periode bulan ({monthlyPajakGroups.map((g) => g.label).join(', ')}) memiliki lembar buku resmi tersendiri lengkap dengan kop bulan berjalan, rekap potongan/penyetoran pajak, tutup buku akhir bulan, dan 3 tanda tangan lengkap.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar Aksi Kotak Centang (Checkbox) - Membantu Edit atau Hapus Transaksi */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl border transition-all print:hidden ${
          selectedRowIds.length > 0
            ? 'bg-amber-400 text-purple-950 border-amber-500 shadow-lg sticky top-2 z-30'
            : 'bg-purple-950/60 text-purple-100 border-purple-800/70'
        }`}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={toggleSelectAll}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
              selectedRowIds.length > 0
                ? 'bg-purple-950 text-amber-300 hover:bg-purple-900'
                : 'bg-purple-900/90 text-amber-300 hover:bg-purple-800 border border-amber-400/30'
            }`}
          >
            {isAllSelected ? (
              <CheckSquare className="w-4 h-4 text-amber-400" />
            ) : (
              <Square className="w-4 h-4 text-amber-400" />
            )}
            <span>{isAllSelected ? 'Batal Centang Semua' : 'Centang Semua Baris'}</span>
          </button>

          <span className="text-xs font-bold">
            {selectedRowIds.length > 0 ? (
              <span>
                <strong>{selectedRowIds.length}</strong> dari {selectableRows.length} baris transaksi dicentang
              </span>
            ) : (
              <span>
                Klik kotak centang di sebelah kiri baris tabel untuk memilih transaksi yang ingin diedit atau dihapus
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            disabled={selectedRowIds.length === 0}
            onClick={handleOpenEditSelected}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
              selectedRowIds.length > 0
                ? 'bg-blue-700 hover:bg-blue-600 text-white shadow-sm'
                : 'bg-purple-900/40 text-purple-400/50 border border-purple-800/40 cursor-not-allowed'
            }`}
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>
              Edit yang Dicentang {selectedRowIds.length > 0 ? `(${selectedRowIds.length})` : ''}
            </span>
          </button>

          <button
            type="button"
            disabled={selectedRowIds.length === 0}
            onClick={() => setConfirmDeleteIds([...selectedRowIds])}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
              selectedRowIds.length > 0
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm'
                : 'bg-purple-900/40 text-purple-400/50 border border-purple-800/40 cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>
              Hapus yang Dicentang {selectedRowIds.length > 0 ? `(${selectedRowIds.length})` : ''}
            </span>
          </button>

          {selectedRowIds.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedRowIds([])}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-purple-950/15 hover:bg-purple-950/25 text-purple-950 cursor-pointer"
            >
              Reset Pilihan
            </button>
          )}
        </div>
      </div>

      {/* Render Each Running Month Sheet matching BKU Tunai & Format Resmi */}
      {groupsToRender.map((group, gIdx) => (
        <div
          key={group.monthKey}
          className={`bg-white rounded-xl shadow-md border border-slate-300 p-6 sm:p-8 print:p-0 print:border-none print:shadow-none print:w-full text-black sheet-paper font-sans ${
            gIdx > 0 ? 'mt-8 print:mt-0 print:break-before-page' : ''
          }`}
        >
          {/* Centered Header Titles */}
          <div className="text-center space-y-0.5 mb-5 text-black">
            <h1 className="text-sm sm:text-base font-bold uppercase tracking-wide text-black">
              {profile.namaSekolah}
            </h1>
            <h2 className="text-sm sm:text-base font-bold uppercase tracking-wide text-black">
              BUKU KAS UMUM
            </h2>
            <h3 className="text-sm sm:text-base font-bold uppercase tracking-wide text-black">
              BUKU PEMBANTU PAJAK
            </h3>
            <p className="text-xs sm:text-sm font-bold uppercase text-black">
              BULAN : {group.label.toUpperCase()}
            </p>
          </div>

          {/* Left Metadata: Kepala Sekolah & Bendahara Pengeluaran */}
          <div className="mb-3 text-xs sm:text-[13px] print:text-[11px] text-black font-semibold">
            <table className="border-none">
              <tbody>
                <tr>
                  <td className="pr-4 py-0.5 font-semibold text-black">Kepala Sekolah</td>
                  <td className="pr-2 py-0.5 font-semibold text-black">:</td>
                  <td className="py-0.5 font-semibold text-black">{profile.namaKepalaSekolah}</td>
                </tr>
                <tr>
                  <td className="pr-4 py-0.5 font-semibold text-black">Bendahara Pengeluaran</td>
                  <td className="pr-2 py-0.5 font-semibold text-black">:</td>
                  <td className="py-0.5 font-semibold text-black">{profile.namaBendahara}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Main 7-Column Table (+ Checkbox & Aksi hidden in print) */}
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full border-collapse border border-black text-xs sm:text-[12.5px] print:text-[10.5px] text-black">
              <thead>
                <tr className="bg-white text-black font-bold text-center">
                  <th
                    className="border border-black py-2 px-2 w-10 align-middle print:hidden bg-amber-50 cursor-pointer"
                    onClick={toggleSelectAll}
                    title="Centang / Batal Centang Semua Baris"
                  >
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 accent-purple-900 rounded cursor-pointer"
                    />
                  </th>
                  <th className="border border-black py-2 px-1.5 w-12 align-middle">
                    No<br />Urut
                  </th>
                  <th className="border border-black py-2 px-2 w-24 align-middle">
                    Tanggal
                  </th>
                  <th className="border border-black py-2 px-2 w-28 align-middle">
                    Nomor Bukti
                  </th>
                  <th className="border border-black py-2 px-3 text-center align-middle">
                    Uraian
                  </th>
                  <th className="border border-black py-2 px-2.5 w-36 align-middle">
                    Penerimaan<br />Rp.
                  </th>
                  <th className="border border-black py-2 px-2.5 w-36 align-middle">
                    Pengeluaran<br />Rp.
                  </th>
                  <th className="border border-black py-2 px-2.5 w-36 align-middle">
                    Saldo<br />Rp.
                  </th>
                  <th className="border border-black py-2 px-2 w-24 align-middle print:hidden bg-slate-100">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {group.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="border border-black py-5 px-4 text-center text-slate-600 bg-slate-50 italic"
                    >
                      <div className="space-y-1.5">
                        <p className="font-bold text-slate-800 text-xs sm:text-sm">
                          Nihil — Tidak terdapat transaksi pemotongan dan penyetoran pajak pada periode {group.label}.
                        </p>
                        <p className="text-[11px] text-slate-500 max-w-xl mx-auto">
                          Sesuai aturan perpajakan P2SP Swakelola (KPP Pratama), belanja material toko swakelola biasa dan upah tukang &le; Rp 450.000/hari bebas potongan pajak.
                        </p>
                        <div className="pt-2 print:hidden flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setAddMode('paket_otomatis');
                              const mNum = String(group.monthKey.split('-')[1]).padStart(2, '0');
                              setFormTanggal(`01/${mNum}/${group.year}`);
                              setIsAddModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-purple-950 font-black text-xs rounded-xl transition cursor-pointer shadow-xs active:scale-95"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>+ Tambah Pajak Bulan {group.monthName}</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleOpenBatchSyncModal}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-950 hover:bg-purple-900 text-amber-300 font-bold text-xs rounded-xl border border-amber-400/40 transition cursor-pointer active:scale-95"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Pilih Belanja BKU</span>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  group.rows.map((r, idx) => {
                    const isChecked = selectedRowIds.includes(r.id);
                    return (
                      <tr
                        key={r.id}
                        className={`transition-colors text-black ${
                          r.isInitialRow
                            ? 'bg-amber-50/70 font-semibold'
                            : isChecked
                            ? 'bg-amber-100/80 print:bg-transparent'
                            : 'hover:bg-amber-50/40'
                        }`}
                      >
                        {/* Kotak Centang (Hidden in Print) */}
                        <td
                          className="border border-black py-1 px-2 text-center print:hidden cursor-pointer"
                          onClick={() => !r.isInitialRow && toggleSelectRow(r.id)}
                        >
                          {!r.isInitialRow && (
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelectRow(r.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 accent-purple-900 rounded cursor-pointer"
                            />
                          )}
                        </td>

                        {/* No Urut */}
                        <td className="border border-black py-1 px-1.5 text-center font-mono">
                          {r.noUrut}
                        </td>

                        {/* Tanggal (DD/MM/YYYY) */}
                        <td className="border border-black py-1 px-2 text-center font-mono whitespace-nowrap">
                          {r.tanggalFormatted}
                        </td>

                        {/* Nomor Bukti */}
                        <td className="border border-black py-1 px-2 text-center font-mono whitespace-nowrap">
                          {r.nomorBukti || ''}
                        </td>

                        {/* Uraian */}
                        <td className="border border-black py-1 px-2.5 text-left">
                          {r.uraian}
                        </td>

                        {/* Penerimaan Rp. */}
                        <td className="border border-black py-1 px-2 font-mono whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>Rp</span>
                            <span>
                              {r.penerimaan > 0 ? r.penerimaan.toLocaleString('id-ID') : '-'}
                            </span>
                          </div>
                        </td>

                        {/* Pengeluaran Rp. */}
                        <td className="border border-black py-1 px-2 font-mono whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>Rp</span>
                            <span>
                              {r.pengeluaran > 0 ? r.pengeluaran.toLocaleString('id-ID') : '-'}
                            </span>
                          </div>
                        </td>

                        {/* Saldo Rp. */}
                        <td className="border border-black py-1 px-2 font-mono whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>Rp</span>
                            <span>
                              {r.saldo > 0 ? r.saldo.toLocaleString('id-ID') : '-'}
                            </span>
                          </div>
                        </td>

                        {/* Aksi (Hidden in Print) */}
                        <td className="border border-black py-1 px-1.5 text-center print:hidden bg-slate-50/80 whitespace-nowrap">
                          {!r.isInitialRow ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => movePajakRow(r.id, 'up')}
                                disabled={idx === 0}
                                className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 text-slate-700 cursor-pointer"
                                title="Geser ke atas"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => movePajakRow(r.id, 'down')}
                                disabled={idx === group.rows.length - 1}
                                className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 text-slate-700 cursor-pointer"
                                title="Geser ke bawah"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingRow({ ...r })}
                                className="p-1 rounded hover:bg-blue-100 text-blue-700 cursor-pointer"
                                title="Edit baris ini"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteIds([r.id])}
                                className="p-1 rounded hover:bg-rose-100 text-rose-700 cursor-pointer"
                                title="Hapus baris"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic font-sans">
                              Saldo Awal
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}

                {/* Summary Footer Row for this Month */}
                <tr className="bg-slate-50 print:bg-white font-bold text-black border-t-2 border-black">
                  <td className="border border-black py-1.5 px-1 print:hidden bg-slate-100"></td>
                  <td
                    colSpan={4}
                    className="border border-black py-1.5 px-3 text-center uppercase tracking-wide font-black"
                  >
                    JUMLAH PAJAK BULAN {group.monthName.toUpperCase()}
                  </td>
                  <td className="border border-black py-1.5 px-2 font-mono whitespace-nowrap">
                    <div className="flex items-center justify-between gap-1">
                      <span>Rp</span>
                      <span>
                        {group.totalPenerimaanPajak > 0
                          ? group.totalPenerimaanPajak.toLocaleString('id-ID')
                          : '-'}
                      </span>
                    </div>
                  </td>
                  <td className="border border-black py-1.5 px-2 font-mono whitespace-nowrap">
                    <div className="flex items-center justify-between gap-1">
                      <span>Rp</span>
                      <span>
                        {group.totalPengeluaranPajak > 0
                          ? group.totalPengeluaranPajak.toLocaleString('id-ID')
                          : '-'}
                      </span>
                    </div>
                  </td>
                  <td className="border border-black py-1.5 px-2 font-mono whitespace-nowrap">
                    <div className="flex items-center justify-between gap-1">
                      <span>Rp</span>
                      <span>
                        {group.saldoAkhirPajak > 0
                          ? group.saldoAkhirPajak.toLocaleString('id-ID')
                          : '-'}
                      </span>
                    </div>
                  </td>
                  <td className="border border-black py-1.5 px-1 print:hidden bg-slate-100"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Monthly Closing Statement */}
          <div className="mt-4 text-xs sm:text-[12px] print:text-[10px] text-black space-y-1 border-t border-slate-400 pt-3">
            <p>
              Pada hari ini : <span className="font-bold">{group.tanggalTutupBuku}</span> Buku Pembantu Pajak ditutup dengan posisi saldo kas pajak sebesar : <span className="font-bold">Rp {group.saldoAkhirPajak.toLocaleString('id-ID')}</span>
            </p>
            <p className="italic">
              (Terbilang : {group.saldoAkhirPajak === 0 ? 'Nihil' : terbilangRupiah(group.saldoAkhirPajak)})
            </p>
          </div>

          {/* 3 Signatures Block: Kepala Sekolah, Ketua P2SP, Bendahara */}
          <div className="mt-8 pt-4 text-xs sm:text-[13px] print:text-[11px] break-inside-avoid page-break-inside-avoid text-black">
            <div className="grid grid-cols-3 gap-4 text-center">
              {/* Pihak 1: Kepala Sekolah */}
              <div>
                <p className="font-semibold text-black">Mengetahui,</p>
                <p className="font-bold text-black mb-16">
                  Kepala {profile.namaSekolah || 'Sekolah'}
                </p>
                <p className="font-bold underline uppercase text-black leading-tight">
                  {profile.namaKepalaSekolah}
                </p>
                <p className="text-black font-medium">
                  NIP. {profile.nipKepalaSekolah}
                </p>
              </div>

              {/* Pihak 2: Ketua P2SP */}
              <div>
                <p className="font-semibold text-transparent select-none">.</p>
                <p className="font-bold text-black mb-16">Ketua P2SP</p>
                <p className="font-bold underline uppercase text-black leading-tight">
                  {profile.namaKetuaP2S || profile.namaPanitia || '....................................'}
                </p>
                <p className="text-black font-medium">-</p>
              </div>

              {/* Pihak 3: Bendahara */}
              <div>
                <p className="font-semibold text-black">
                  {profile.tempatPelunasan || profile.kabupaten || 'Palasa'},{' '}
                  {group.tanggalTutupBuku}
                </p>
                <p className="font-bold text-black mb-16">Bendahara</p>
                <p className="font-bold underline uppercase text-black leading-tight">
                  {profile.namaBendahara}
                </p>
                <p className="text-black font-medium">
                  NIP. {profile.nipBendahara}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Modal Tambah Paket / Baris Pajak (Mendukung Multi-Pajak & Pajak Custom) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border-2 border-amber-400 text-slate-900 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-purple-900" />
                <h3 className="text-base font-black text-purple-950">
                  Tambah Transaksi Buku Pembantu Pajak
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switch */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-purple-950/10 rounded-xl mb-4">
              <button
                type="button"
                onClick={() => setAddMode('paket_otomatis')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                  addMode === 'paket_otomatis'
                    ? 'bg-purple-950 text-amber-300 shadow-xs'
                    : 'text-purple-950 hover:bg-white/60'
                }`}
              >
                Paket Belanja + Pajak Otomatis / Custom
              </button>
              <button
                type="button"
                onClick={() => setAddMode('baris_tunggal')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                  addMode === 'baris_tunggal'
                    ? 'bg-purple-950 text-amber-300 shadow-xs'
                    : 'text-purple-950 hover:bg-white/60'
                }`}
              >
                Input 1 Baris Manual
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              {/* Pilihan Cepat dari BKU Tunai */}
              <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-3">
                <label className="block font-black text-purple-950 mb-1">
                  Pilih Transaksi dari BKU Tunai (Otomatis Isi Uraian & Nilai Belanja)
                </label>
                <select
                  value={selectedBkuTunaiTxId}
                  onChange={(e) => handleSelectBkuTunaiTransaction(e.target.value)}
                  className="w-full border-2 border-purple-900/30 rounded-xl px-3 py-2 font-bold text-slate-900 bg-white cursor-pointer"
                >
                  <option value="">
                    -- Pilih dari Daftar Transaksi BKU Tunai ({bkuTunaiTransactions.length} transaksi) --
                  </option>
                  {bkuTunaiTransactions.map((tx, idx) => (
                    <option key={tx.id} value={tx.id}>
                      {idx + 1}. [{formatToSlashDate(tx.tanggal)}] {tx.uraian} — Rp{' '}
                      {tx.pengeluaran.toLocaleString('id-ID')}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-purple-800 mt-1 font-medium">
                  Pilih transaksi di atas agar Tanggal, No. Bukti, Uraian, dan Nilai Belanja terisi otomatis tanpa mengetik ulang.
                </p>
                {detectedTaxHint && (
                  <div
                    className={`mt-2 p-2.5 rounded-xl text-xs font-semibold flex items-start gap-2 border ${
                      detectedTaxHint.startsWith('✓')
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                        : 'bg-amber-50 text-amber-900 border-amber-300'
                    }`}
                  >
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-purple-900" />
                    <span>{detectedTaxHint}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-purple-950 mb-1">
                    Tanggal (DD/MM/YYYY)
                  </label>
                  <input
                    type="text"
                    required
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                    placeholder="11/08/2026"
                    className="w-full border-2 border-purple-900/30 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-purple-950 mb-1">
                    Nomor Bukti (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formNomorBukti}
                    onChange={(e) => setFormNomorBukti(e.target.value)}
                    placeholder="KW-001 / KW-002 / Kosongkan"
                    className="w-full border-2 border-purple-900/30 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-purple-950 mb-1">
                  Uraian Transaksi (Bisa Pilih dari List BKU Tunai atau Ketik Manual)
                </label>
                <input
                  type="text"
                  required
                  list="bku-tunai-uraian-list"
                  value={formUraian}
                  onChange={(e) => handleUraianInputChange(e.target.value)}
                  placeholder="Klik 2x untuk melihat daftar uraian BKU Tunai atau ketik..."
                  className="w-full border-2 border-purple-900/30 rounded-xl px-3 py-2 font-bold text-slate-900"
                />
                <datalist id="bku-tunai-uraian-list">
                  {bkuTunaiTransactions.map((tx) => (
                    <option
                      key={tx.id}
                      value={tx.uraian}
                      label={`${formatToSlashDate(tx.tanggal)} — Rp ${tx.pengeluaran.toLocaleString('id-ID')}`}
                    />
                  ))}
                </datalist>
              </div>

              {addMode === 'paket_otomatis' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-purple-950 mb-1">
                        Nilai Belanja (Rp)
                      </label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={formNominalBelanja}
                        onChange={(e) =>
                          handleNominalBelanjaChange(Number(e.target.value) || 0)
                        }
                        className="w-full border-2 border-purple-900/30 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-bold text-purple-950">
                          Jenis Pajak (Preset / Kombinasi / Custom)
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsNewPresetOpen((v) => !v)}
                          className="text-[11px] font-black text-purple-800 hover:text-purple-950 underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <Settings2 className="w-3 h-3" />
                          <span>+ Simpan Menu Pajak Custom</span>
                        </button>
                      </div>
                      <select
                        value={formJenisPajak}
                        onChange={(e) =>
                          handleJenisPajakChange(e.target.value as JenisPajak)
                        }
                        className="w-full border-2 border-purple-900/30 rounded-xl px-3 py-2 font-bold text-slate-900 bg-white cursor-pointer"
                      >
                        <optgroup label="Kewajiban Pajak P2SP Resmi (KPP Pratama Palu)">
                          <option value="PPh Pasal 4(2)">PPh Final Ps 4(2) (4%) - Jasa Perencana / Pengawas</option>
                          <option value="PPh Final Konstruksi">PPh Final Ps 4(2) (4%) - Pelaksanaan Borongan Konstruksi</option>
                          <option value="PPh 4(2) Kecil">PPh Final Ps 4(2) (1,75%) - Kualifikasi Usaha Kecil</option>
                          <option value="PPh 23">PPh Pasal 23 (2%) - Sewa Alat / Molen / Angkutan</option>
                          <option value="PPh 21 Tenaga Ahli">PPh 21 Tenaga Ahli / Fasilitator Non-PNS (2,5%)</option>
                          <option value="PPh 21 PNS Gol III">PPh 21 Honorarium PNS Golongan III (5%)</option>
                          <option value="PPh 21 PNS Gol IV">PPh 21 Honorarium PNS Golongan IV (15%)</option>
                          <option value="PPh 21 Tukang Tinggi">PPh 21 Upah Tukang &gt; Rp 450rb/hari (TER 0,5%)</option>
                        </optgroup>
                        <optgroup label="Pajak Belanja Rekanan Toko (Khusus PKP)">
                          <option value="PPN">PPN (11%) - Toko Rekanan PKP</option>
                          <option value="PPh 22">PPh 22 (1,5%) - Belanja Instansi &gt; Rp 2 Jt</option>
                          <option value="Pajak Daerah">Pajak Daerah (10%)</option>
                        </optgroup>
                        <optgroup label="Paket Kombinasi 2 Pajak Sekaligus">
                          <option value="PPN + PPh 22">PPN (11%) + PPh 22 (1,5%) Sekaligus</option>
                          <option value="PPN + PPh 4%">PPN (11%) + PPh 4% (4%) Sekaligus</option>
                          <option value="PPN + PPh 23">PPN (11%) + PPh 23 (2%) Sekaligus</option>
                          <option value="PPN + PPh 21">PPN (11%) + PPh 21 (5%) Sekaligus</option>
                        </optgroup>
                        {customPresets.length > 0 && (
                          <optgroup label="Menu Pajak Custom Anda">
                            {customPresets.map((p) => (
                              <option key={p.id} value={`CUSTOM_PRESET:${p.id}`}>
                                {p.namaMenu} ({p.items.map((i) => `${i.label} ${i.persen}%`).join(' + ')})
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="Kustomisasi Bebas">
                          <option value="Custom">Custom / Atur Kombinasi Pajak Sendiri...</option>
                        </optgroup>
                      </select>
                    </div>
                  </div>

                  {/* Box Simpan Kombinasi Pajak sebagai Menu Preset Custom */}
                  {isNewPresetOpen && (
                    <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-purple-950">
                          Simpan Rincian Pajak di Bawah ke Menu Pilihan Jenis Pajak
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsNewPresetOpen(false)}
                          className="text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newPresetName}
                          onChange={(e) => setNewPresetName(e.target.value)}
                          placeholder="Nama Menu, misal: Paket PPN 11% + PPh 4% Konstruksi"
                          className="flex-1 border-2 border-purple-900/30 rounded-xl px-3 py-1.5 font-bold bg-white"
                        />
                        <button
                          type="button"
                          onClick={handleSaveCurrentAsPreset}
                          className="px-3.5 py-1.5 bg-purple-950 text-amber-300 font-black rounded-xl hover:bg-purple-900 cursor-pointer whitespace-nowrap"
                        >
                          Simpan ke Menu
                        </button>
                      </div>
                      {customPresets.length > 0 && (
                        <div className="pt-1 border-t border-amber-200 flex flex-wrap gap-1.5 items-center">
                          <span className="text-[11px] font-bold text-slate-600">
                            Menu Custom Tersimpan:
                          </span>
                          {customPresets.map((cp) => (
                            <span
                              key={cp.id}
                              className="inline-flex items-center gap-1 bg-white border border-purple-300 px-2 py-0.5 rounded-lg text-[11px] font-bold text-purple-950"
                            >
                              {cp.namaMenu}
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomPreset(cp.id)}
                                className="text-rose-600 hover:text-rose-800 cursor-pointer"
                                title="Hapus menu custom ini"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rincian Daftar Pajak pada Transaksi Ini (Bisa Tambah Pajak / Custom Nama & Persen) */}
                  <div className="bg-slate-50 border-2 border-purple-900/20 rounded-2xl p-3.5 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="font-black text-purple-950 text-xs">
                          Daftar Pajak yang Dikenakan ({taxItems.length} Jenis Pajak)
                        </h4>
                        <p className="text-[11px] text-slate-600">
                          Anda bisa mengubah nama pajak, mengatur tarif persen (%), atau klik <strong>+ Tambah Pajak</strong> untuk menggabungkan beberapa pajak (misal PPN + PPh 4%).
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddTaxItemRow('PPh 4%', 4)}
                        className="flex items-center gap-1 bg-purple-950 hover:bg-purple-900 text-amber-300 font-black px-3 py-1.5 rounded-xl text-xs shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Tambah Pajak</span>
                      </button>
                    </div>

                    {/* Tombol Pintas Tambah Cepat */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] font-bold text-slate-500">
                        Tambah Cepat:
                      </span>
                      {DEFAULT_SINGLE_TAX_OPTIONS.map((opt) => (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => handleAddTaxItemRow(opt.label, opt.persen)}
                          className="px-2 py-0.5 rounded-lg bg-white hover:bg-purple-100 border border-purple-300 text-[11px] font-bold text-purple-950 cursor-pointer transition"
                        >
                          + {opt.label} ({opt.persen}%)
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleAddTaxItemRow('Pajak Custom', 0)}
                        className="px-2 py-0.5 rounded-lg bg-amber-100 hover:bg-amber-200 border border-amber-400 text-[11px] font-black text-purple-950 cursor-pointer transition"
                      >
                        + Pajak Custom Bebas
                      </button>
                    </div>

                    <div className="space-y-2 pt-1">
                      {taxItems.map((item, index) => (
                        <div
                          key={item.id}
                          className="bg-white border-2 border-purple-900/20 rounded-xl p-2.5 grid grid-cols-1 sm:grid-cols-12 gap-2 items-end"
                        >
                          <div className="sm:col-span-5">
                            <label className="block text-[11px] font-bold text-purple-950 mb-1">
                              Pajak #{index + 1} (Pilih / Ketik Nama Pajak)
                            </label>
                            <div className="flex gap-1.5">
                              <select
                                value={
                                  DEFAULT_SINGLE_TAX_OPTIONS.some((o) => o.label === item.label)
                                    ? item.label
                                    : 'CUSTOM_LABEL'
                                }
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === 'CUSTOM_LABEL') {
                                    handleUpdateTaxItem(item.id, { label: 'Pajak Custom' }, false);
                                  } else {
                                    const found = DEFAULT_SINGLE_TAX_OPTIONS.find(
                                      (o) => o.label === val
                                    );
                                    if (found) {
                                      handleUpdateTaxItem(
                                        item.id,
                                        { label: found.label, persen: found.persen },
                                        true
                                      );
                                    }
                                  }
                                }}
                                className="w-28 border border-purple-900/30 rounded-lg px-1.5 py-1.5 font-bold text-slate-900 bg-purple-50/60 cursor-pointer text-[11px]"
                              >
                                {DEFAULT_SINGLE_TAX_OPTIONS.map((o) => (
                                  <option key={o.label} value={o.label}>
                                    {o.label} ({o.persen}%)
                                  </option>
                                ))}
                                <option value="CUSTOM_LABEL">Ketik Sendiri...</option>
                              </select>
                              <input
                                type="text"
                                required
                                value={item.label}
                                onChange={(e) =>
                                  handleUpdateTaxItem(item.id, { label: e.target.value }, false)
                                }
                                placeholder="Nama Pajak (misal: PPh 4%)"
                                className="flex-1 min-w-0 border border-purple-900/30 rounded-lg px-2.5 py-1.5 font-bold text-slate-900"
                              />
                            </div>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold text-purple-950 mb-1">
                              Tarif (%)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              value={item.persen}
                              onChange={(e) =>
                                handleUpdateTaxItem(
                                  item.id,
                                  { persen: parseFloat(e.target.value) || 0 },
                                  true
                                )
                              }
                              className="w-full border border-purple-900/30 rounded-lg px-2.5 py-1.5 font-mono font-bold text-slate-900"
                            />
                          </div>

                          <div className="sm:col-span-4">
                            <label className="block text-[11px] font-bold text-purple-950 mb-1">
                              Nominal {item.label || 'Pajak'} (Rp)
                            </label>
                            <input
                              type="number"
                              min={0}
                              required
                              value={item.nominal}
                              onChange={(e) =>
                                handleUpdateTaxItem(
                                  item.id,
                                  { nominal: Number(e.target.value) || 0 },
                                  false
                                )
                              }
                              className="w-full border-2 border-amber-400 bg-amber-50/60 rounded-lg px-2.5 py-1.5 font-mono font-black text-purple-950"
                            />
                          </div>

                          <div className="sm:col-span-1 flex justify-end">
                            <button
                              type="button"
                              disabled={taxItems.length <= 1}
                              onClick={() => handleRemoveTaxItem(item.id)}
                              className="p-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              title="Hapus jenis pajak ini"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-purple-900/10 text-[11px] font-bold text-purple-950">
                      <span>
                        Total Pajak Transaksi Ini ({taxItems.map((t) => t.label).join(' + ')}):
                      </span>
                      <span className="font-mono font-black text-sm">
                        Rp{' '}
                        {taxItems
                          .reduce((acc, item) => acc + (Number(item.nominal) || 0), 0)
                          .toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formTampilkanBarisBelanja}
                        onChange={(e) => setFormTampilkanBarisBelanja(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-900"
                      />
                      <span className="font-bold text-slate-800">
                        Tampilkan baris nilai belanja ("{formUraian || 'Uraian Belanja'}") di tabel BKU Pajak
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formSudahDibayar}
                        onChange={(e) => setFormSudahDibayar(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-900"
                      />
                      <span className="font-bold text-slate-800">
                        Otomatis tambahkan baris "Dibayarkan Pajak" untuk setiap pajak di atas (Saldo Pajak = Rp -)
                      </span>
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-purple-950 mb-1">
                        Penerimaan Rp.
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={singlePenerimaan}
                        onChange={(e) => setSinglePenerimaan(Number(e.target.value) || 0)}
                        className="w-full border-2 border-purple-900/30 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-purple-950 mb-1">
                        Pengeluaran Rp.
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={singlePengeluaran}
                        onChange={(e) => setSinglePengeluaran(Number(e.target.value) || 0)}
                        className="w-full border-2 border-purple-900/30 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={singleIsTaxRow}
                      onChange={(e) => setSingleIsTaxRow(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-900"
                    />
                    <span className="font-bold text-slate-800">
                      Baris ini adalah Pungutan / Setoran Pajak (Mempengaruhi Saldo Pajak)
                    </span>
                  </label>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-purple-950 font-black shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan ke BKU Pajak</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit 1 Baris */}
      {editingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-amber-400 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-base font-black text-purple-950">
                Edit Baris BKU Pajak
              </h3>
              <button
                onClick={() => setEditingRow(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-purple-950 mb-1">
                    Tanggal (DD/MM/YYYY)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingRow.tanggal}
                    onChange={(e) =>
                      setEditingRow({ ...editingRow, tanggal: e.target.value })
                    }
                    className="w-full border-2 border-purple-900/30 rounded-xl px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-purple-950 mb-1">
                    Nomor Bukti
                  </label>
                  <input
                    type="text"
                    value={editingRow.nomorBukti}
                    onChange={(e) =>
                      setEditingRow({ ...editingRow, nomorBukti: e.target.value })
                    }
                    className="w-full border-2 border-purple-900/30 rounded-xl px-3 py-2 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-purple-950 mb-1">
                  Uraian
                </label>
                <input
                  type="text"
                  required
                  list="bku-tunai-uraian-list-edit"
                  value={editingRow.uraian}
                  onChange={(e) =>
                    setEditingRow({ ...editingRow, uraian: e.target.value })
                  }
                  className="w-full border-2 border-purple-900/30 rounded-xl px-3 py-2 font-bold"
                />
                <datalist id="bku-tunai-uraian-list-edit">
                  {bkuTunaiTransactions.map((tx) => (
                    <option
                      key={tx.id}
                      value={tx.uraian}
                      label={`${formatToSlashDate(tx.tanggal)} — Rp ${tx.pengeluaran.toLocaleString('id-ID')}`}
                    />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-purple-950 mb-1">
                    Penerimaan Rp.
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editingRow.penerimaan}
                    onChange={(e) =>
                      setEditingRow({
                        ...editingRow,
                        penerimaan: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full border-2 border-purple-900/30 rounded-xl px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-purple-950 mb-1">
                    Pengeluaran Rp.
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editingRow.pengeluaran}
                    onChange={(e) =>
                      setEditingRow({
                        ...editingRow,
                        pengeluaran: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full border-2 border-purple-900/30 rounded-xl px-3 py-2 font-mono font-bold"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    editingRow.isTaxRow !== undefined
                      ? editingRow.isTaxRow
                      : /^(diterima|dibayarkan|dipungut|disetor|ppn|pph)/i.test(
                          editingRow.uraian.trim()
                        )
                  }
                  onChange={(e) =>
                    setEditingRow({ ...editingRow, isTaxRow: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-purple-900"
                />
                <span className="font-bold text-slate-800">
                  Baris Pungutan/Setoran Pajak (Hitung ke Saldo Pajak)
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingRow(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-purple-950 font-black shadow-md cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Sekaligus untuk Beberapa Baris yang Dicentang */}
      {bulkEditRows && bulkEditRows.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border-2 border-amber-400 text-slate-900 my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <div>
                <h3 className="text-base font-black text-purple-950">
                  Edit Transaksi yang Dicentang ({bulkEditRows.length} Baris)
                </h3>
                <p className="text-xs text-slate-600">
                  Anda dapat menyamakan Tanggal/Nomor Bukti sekaligus atau mengedit langsung setiap baris di bawah ini.
                </p>
              </div>
              <button
                onClick={() => setBulkEditRows(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bar Ubah Serentak Tanggal / No Bukti */}
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3 mb-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={bulkTanggalApply}
                  onChange={(e) => setBulkTanggalApply(e.target.value)}
                  placeholder="Samakan Tanggal (misal: 15/08/2026)"
                  className="flex-1 border border-purple-300 rounded-xl px-3 py-1.5 font-mono font-bold bg-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (bulkTanggalApply.trim()) {
                      handleApplyBulkFieldToDraft('tanggal', bulkTanggalApply.trim());
                    }
                  }}
                  className="px-3 py-1.5 bg-purple-950 text-amber-300 font-black rounded-xl hover:bg-purple-900 cursor-pointer whitespace-nowrap"
                >
                  Terapkan Tanggal
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={bulkNomorBuktiApply}
                  onChange={(e) => setBulkNomorBuktiApply(e.target.value)}
                  placeholder="Samakan Nomor Bukti"
                  className="flex-1 border border-purple-300 rounded-xl px-3 py-1.5 font-mono font-bold bg-white"
                />
                <button
                  type="button"
                  onClick={() =>
                    handleApplyBulkFieldToDraft('nomorBukti', bulkNomorBuktiApply.trim())
                  }
                  className="px-3 py-1.5 bg-purple-950 text-amber-300 font-black rounded-xl hover:bg-purple-900 cursor-pointer whitespace-nowrap"
                >
                  Terapkan No. Bukti
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveBulkEdit} className="flex-1 flex flex-col min-h-0">
              <div className="overflow-y-auto flex-1 border border-slate-200 rounded-2xl">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-purple-950 text-amber-300 sticky top-0">
                    <tr>
                      <th className="py-2 px-2 text-left w-28">Tanggal</th>
                      <th className="py-2 px-2 text-left w-28">No. Bukti</th>
                      <th className="py-2 px-2 text-left">Uraian Transaksi</th>
                      <th className="py-2 px-2 text-right w-32">Penerimaan (Rp)</th>
                      <th className="py-2 px-2 text-right w-32">Pengeluaran (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {bulkEditRows.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="p-2">
                          <input
                            type="text"
                            required
                            value={row.tanggal}
                            onChange={(e) => {
                              const next = [...bulkEditRows];
                              next[idx] = { ...row, tanggal: e.target.value };
                              setBulkEditRows(next);
                            }}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.nomorBukti}
                            onChange={(e) => {
                              const next = [...bulkEditRows];
                              next[idx] = { ...row, nomorBukti: e.target.value };
                              setBulkEditRows(next);
                            }}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            required
                            list="bku-tunai-uraian-list-edit"
                            value={row.uraian}
                            onChange={(e) => {
                              const next = [...bulkEditRows];
                              next[idx] = { ...row, uraian: e.target.value };
                              setBulkEditRows(next);
                            }}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1 font-bold"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={0}
                            value={row.penerimaan}
                            onChange={(e) => {
                              const next = [...bulkEditRows];
                              next[idx] = {
                                ...row,
                                penerimaan: Number(e.target.value) || 0,
                              };
                              setBulkEditRows(next);
                            }}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold text-right"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={0}
                            value={row.pengeluaran}
                            onChange={(e) => {
                              const next = [...bulkEditRows];
                              next[idx] = {
                                ...row,
                                pengeluaran: Number(e.target.value) || 0,
                              };
                              setBulkEditRows(next);
                            }}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold text-right"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setBulkEditRows(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-purple-950 font-black shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Semua ({bulkEditRows.length} Baris)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Baris yang Dicentang */}
      {confirmDeleteIds && confirmDeleteIds.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-rose-500 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <h3 className="text-base font-black text-rose-700 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                <span>Konfirmasi Hapus Transaksi Pajak</span>
              </h3>
              <button
                onClick={() => setConfirmDeleteIds(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-700 font-medium mb-4">
              Apakah Anda yakin ingin menghapus{' '}
              <strong className="text-slate-900">{confirmDeleteIds.length} baris</strong> transaksi
              yang dipilih dari Buku Pembantu Pajak?
            </p>
            <div className="flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setConfirmDeleteIds(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteExecute}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus ({confirmDeleteIds.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pilih Belanja Berpajak dari BKU */}
      {isBatchSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border-2 border-amber-400 text-slate-900 my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <div>
                <h3 className="text-base font-black text-purple-950 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-purple-900" />
                  <span>Pilih Belanja Berpajak dari BKU (Aturan P2SP KPP Pratama)</span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Hanya belanja yang memiliki kewajiban pajak yang otomatis dicentang untuk dimasukkan ke Buku Pembantu Pajak.
                </p>
              </div>
              <button
                onClick={() => setIsBatchSyncModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selection Quick Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-purple-50 p-2.5 rounded-2xl border border-purple-200 mb-3 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const taxableIds = transactions
                      .filter((t) => t.metode !== 'TARIK_TUNAI' && t.pengeluaran > 0 && detectTaxForTransaction(t).length > 0)
                      .map((t) => t.id);
                    setBatchSelectedTxIds(taxableIds);
                  }}
                  className="px-3 py-1 bg-purple-950 text-amber-300 font-bold rounded-lg hover:bg-purple-900 cursor-pointer"
                >
                  Pilih Hanya yang Kena Pajak ({transactions.filter((t) => t.pengeluaran > 0 && detectTaxForTransaction(t).length > 0).length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const allExpenseIds = transactions
                      .filter((t) => t.metode !== 'TARIK_TUNAI' && t.pengeluaran > 0)
                      .map((t) => t.id);
                    setBatchSelectedTxIds(allExpenseIds);
                  }}
                  className="px-3 py-1 bg-white text-purple-950 font-bold border border-purple-300 rounded-lg hover:bg-purple-100 cursor-pointer"
                >
                  Pilih Semua Belanja
                </button>
                <button
                  type="button"
                  onClick={() => setBatchSelectedTxIds([])}
                  className="px-3 py-1 text-slate-600 hover:text-slate-900 font-bold cursor-pointer"
                >
                  Hapus Pilihan
                </button>
              </div>

              <span className="font-bold text-purple-950">
                <strong>{batchSelectedTxIds.length}</strong> transaksi terpilih
              </span>
            </div>

            {/* List Transaksi */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 text-xs">
              {transactions
                .filter((t) => t.metode !== 'TARIK_TUNAI' && t.jenis === 'PENGELUARAN' && t.pengeluaran > 0)
                .map((tx) => {
                  const detected = detectTaxForTransaction(tx);
                  const isTaxable = detected.length > 0;
                  const isChecked = batchSelectedTxIds.includes(tx.id);

                  return (
                    <div
                      key={tx.id}
                      onClick={() => handleToggleBatchTx(tx.id)}
                      className={`p-3 flex items-start gap-3 transition cursor-pointer ${
                        isChecked ? 'bg-amber-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleBatchTx(tx.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 mt-0.5 accent-purple-900 rounded cursor-pointer shrink-0"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-slate-600">
                            {formatToSlashDate(tx.tanggal)}
                          </span>
                          {tx.nomorBukti && (
                            <span className="font-mono bg-purple-100 text-purple-950 px-1.5 py-0.5 rounded text-[10px] font-black">
                              {tx.nomorBukti}
                            </span>
                          )}
                          <span className="font-bold text-slate-900 text-sm">
                            {tx.uraian}
                          </span>
                        </div>

                        {tx.penerima && (
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Penerima: <strong>{tx.penerima}</strong>
                          </p>
                        )}

                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          {isTaxable ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 border border-emerald-300 text-emerald-950 px-2 py-0.5 rounded-md font-bold text-[11px]">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>{detected.map((d) => `${d.label} (Rp ${d.nominal.toLocaleString('id-ID')})`).join(' + ')}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-300 text-slate-600 px-2 py-0.5 rounded-md text-[11px]">
                              <span>Bebas Pemotongan Pajak (Material Swakelola / Upah &le; 450rb)</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="block font-mono font-black text-sm text-purple-950">
                          Rp {tx.pengeluaran.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-200 text-xs">
              <p className="text-slate-600 font-medium">
                Hanya transaksi yang dicentang di atas yang akan dimasukkan ke Buku Pembantu Pajak.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBatchSyncModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApplyBatchSync}
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-purple-950 font-black shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Terapkan ke BKU Pajak ({batchSelectedTxIds.length})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
