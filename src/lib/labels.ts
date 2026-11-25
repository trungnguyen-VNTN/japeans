/** Vietnamese labels for common JMdict tags. Unknown tags fall back to the raw code. */
const POS: Record<string, string> = {
  n: "danh từ",
  "n-adv": "danh từ (trạng ngữ)",
  "n-t": "danh từ chỉ thời gian",
  "n-suf": "danh từ (hậu tố)",
  "n-pref": "danh từ (tiền tố)",
  pn: "đại từ",
  num: "số từ",
  ctr: "trợ số từ",
  vs: "danh động từ (+する)",
  "vs-i": "động từ する",
  "vs-s": "động từ する (đặc biệt)",
  vz: "động từ ずる",
  v1: "động từ nhóm 2",
  "v1-s": "động từ nhóm 2 (đặc biệt)",
  vk: "động từ nhóm 3 (来る)",
  vt: "tha động từ",
  vi: "tự động từ",
  "aux-v": "trợ động từ",
  "adj-i": "tính từ -い",
  "adj-ix": "tính từ -い (いい/よい)",
  "adj-na": "tính từ -な",
  "adj-no": "danh từ + の",
  "adj-pn": "liên thể từ",
  "adj-t": "tính từ -たる",
  "adj-f": "bổ nghĩa danh từ",
  adv: "trạng từ",
  "adv-to": "trạng từ (+と)",
  prt: "trợ từ",
  conj: "liên từ",
  int: "thán từ",
  exp: "cụm từ, thành ngữ",
  pref: "tiền tố",
  suf: "hậu tố",
  aux: "trợ từ phụ",
  cop: "hệ từ",
};

const MISC: Record<string, string> = {
  uk: "thường viết bằng kana",
  hon: "tôn kính ngữ",
  hum: "khiêm nhường ngữ",
  pol: "lịch sự",
  col: "khẩu ngữ",
  sl: "tiếng lóng",
  abbr: "viết tắt",
  arch: "cổ",
  obs: "lỗi thời",
  rare: "hiếm",
  vulg: "thô tục",
  derog: "miệt thị",
  sens: "nhạy cảm",
  "on-mim": "từ tượng thanh/tượng hình",
  yoji: "thành ngữ 4 chữ",
  id: "thành ngữ",
  proverb: "tục ngữ",
  fam: "thân mật",
  male: "nam giới dùng",
  fem: "nữ giới dùng",
  joc: "đùa",
  form: "trang trọng",
  poet: "thơ ca",
  chn: "ngôn ngữ trẻ em",
};

export function posLabel(code: string): string {
  if (POS[code]) return POS[code];
  if (code.startsWith("v5")) return "động từ nhóm 1";
  if (code.startsWith("v2") || code.startsWith("v4")) return "động từ cổ";
  return code;
}

export function miscLabel(code: string): string {
  return MISC[code] ?? code;
}

/** Collapse "v5u" + "vt" etc. into a de-duplicated, readable list. */
export function posLabels(codes: string[]): string[] {
  return [...new Set(codes.map(posLabel))];
}

export function gradeLabel(grade: number | null): string | null {
  if (!grade) return null;
  if (grade <= 6) return `Tiểu học lớp ${grade}`;
  if (grade === 8) return "Trung học (Jōyō)";
  return "Jinmeiyō (tên người)";
}
