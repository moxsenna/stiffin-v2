export interface ReflectionConfig {
  reflectionType?: string | null;
  reflectionPrompt?: string | null;
  reflectionOptions?: Array<{ id: string; label: string }> | null;
}

export interface ReflectionSubmission {
  responseText?: string | null;
  selectedOptions?: string[] | null;
}

export interface ReflectionValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateReflectionSubmission(
  config: ReflectionConfig,
  submission: ReflectionSubmission
): ReflectionValidationResult {
  const type = config.reflectionType;
  if (!type) {
    return { isValid: true };
  }

  const allowedOptionIds = new Set((config.reflectionOptions ?? []).map((o) => o.id));

  if (type === 'long_text') {
    const text = submission.responseText?.trim();
    if (!text || text.length === 0) {
      return { isValid: false, error: 'Jawaban refleksi tidak boleh kosong' };
    }
    if (text.length > 5000) {
      return { isValid: false, error: 'Jawaban refleksi melebihi batas 5000 karakter' };
    }
    return { isValid: true };
  }

  if (type === 'single_select') {
    const choice = submission.responseText?.trim() || submission.selectedOptions?.[0]?.trim();
    if (!choice) {
      return { isValid: false, error: 'Pilihan opsi refleksi wajib dipilih' };
    }
    if (allowedOptionIds.size > 0 && !allowedOptionIds.has(choice)) {
      return { isValid: false, error: 'Pilihan opsi tidak valid sesuai konfigurasi materi' };
    }
    return { isValid: true };
  }

  if (type === 'multi_select') {
    const options = submission.selectedOptions;
    if (!Array.isArray(options) || options.length === 0) {
      return { isValid: false, error: 'Pilih setidaknya satu opsi refleksi' };
    }
    if (allowedOptionIds.size > 0) {
      for (const opt of options) {
        if (!allowedOptionIds.has(opt)) {
          return { isValid: false, error: `Opsi "${opt}" tidak valid sesuai konfigurasi materi` };
        }
      }
    }
    return { isValid: true };
  }

  return { isValid: true };
}
