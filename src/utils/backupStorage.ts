import { ProjectProfile, Transaction, BangunanProyek, AbsenMingguanTukang, CustomBahanItem } from '../types';

export interface BackupDataPayload {
  app: string;
  version: number;
  exportedAt: string;
  appName: string;
  metadata: {
    namaSekolah: string;
    tahunAnggaran: string;
    bulanLaporan: string;
    totalTransactions: number;
    totalBangunan: number;
    totalAbsenWeeks: number;
  };
  data: {
    profile: ProjectProfile;
    transactions: Transaction[];
    bangunanList?: BangunanProyek[];
    absenTukangList?: AbsenMingguanTukang[];
    customBahanList?: CustomBahanItem[];
  };
}

export const createBackupPayload = (state: {
  profile: ProjectProfile;
  transactions: Transaction[];
  bangunanList?: BangunanProyek[];
  absenTukangList?: AbsenMingguanTukang[];
  customBahanList?: CustomBahanItem[];
}): BackupDataPayload => {
  return {
    app: 'ah-beres-lpj',
    version: 2,
    appName: 'Ah Beres - LPJ DAK Fisik',
    exportedAt: new Date().toISOString(),
    metadata: {
      namaSekolah: state.profile.namaSekolah || 'Sekolah',
      tahunAnggaran: state.profile.tahunAnggaran || '',
      bulanLaporan: state.profile.bulanLaporan || '',
      totalTransactions: state.transactions?.length || 0,
      totalBangunan: state.bangunanList?.length || 0,
      totalAbsenWeeks: state.absenTukangList?.length || 0,
    },
    data: {
      profile: state.profile,
      transactions: state.transactions,
      bangunanList: state.bangunanList || [],
      absenTukangList: state.absenTukangList || [],
      customBahanList: state.customBahanList || [],
    },
  };
};

export const downloadBackupJson = (payload: BackupDataPayload): string => {
  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  
  const safeSchoolName = (payload.metadata.namaSekolah || 'LPJ')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 30);
  
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `BACKUP_LPJ_${safeSchoolName}_${dateStr}.json`;

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return filename;
};

export const validateBackupPayload = (
  raw: any
): { valid: boolean; error?: string; payload?: BackupDataPayload } => {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Format berkas tidak valid (bukan JSON yang sesuai).' };
  }

  // Support direct structure or wrapped data
  let dataToVerify = raw.data ? raw.data : raw;

  if (!dataToVerify.profile || typeof dataToVerify.profile !== 'object') {
    return { valid: false, error: 'Berkas cadangan tidak memiliki data Identitas Proyek/Kop (Profile).' };
  }

  if (!Array.isArray(dataToVerify.transactions)) {
    return { valid: false, error: 'Berkas cadangan tidak memiliki daftar Transaksi pembukuan.' };
  }

  const payload: BackupDataPayload = {
    app: raw.app || 'ah-beres-lpj',
    version: raw.version || 2,
    appName: raw.appName || 'Ah Beres - LPJ DAK Fisik',
    exportedAt: raw.exportedAt || new Date().toISOString(),
    metadata: {
      namaSekolah: dataToVerify.profile.namaSekolah || 'Sekolah',
      tahunAnggaran: dataToVerify.profile.tahunAnggaran || '',
      bulanLaporan: dataToVerify.profile.bulanLaporan || '',
      totalTransactions: dataToVerify.transactions.length,
      totalBangunan: Array.isArray(dataToVerify.bangunanList) ? dataToVerify.bangunanList.length : 0,
      totalAbsenWeeks: Array.isArray(dataToVerify.absenTukangList) ? dataToVerify.absenTukangList.length : 0,
    },
    data: {
      profile: dataToVerify.profile,
      transactions: dataToVerify.transactions,
      bangunanList: Array.isArray(dataToVerify.bangunanList) ? dataToVerify.bangunanList : undefined,
      absenTukangList: Array.isArray(dataToVerify.absenTukangList) ? dataToVerify.absenTukangList : undefined,
      customBahanList: Array.isArray(dataToVerify.customBahanList) ? dataToVerify.customBahanList : undefined,
    },
  };

  return { valid: true, payload };
};

export const getStorageEstimatedSize = (): {
  itemCount: number;
  estimatedKb: string;
  keyName: string;
} => {
  try {
    const key = 'ah-beres-lpj-storage-v2';
    const raw = localStorage.getItem(key);
    if (!raw) {
      return { itemCount: 0, estimatedKb: '0 KB', keyName: key };
    }
    const bytes = new Blob([raw]).size;
    const kb = (bytes / 1024).toFixed(1);
    return { itemCount: 1, estimatedKb: `${kb} KB`, keyName: key };
  } catch {
    return { itemCount: 0, estimatedKb: 'N/A', keyName: 'ah-beres-lpj-storage-v2' };
  }
};
