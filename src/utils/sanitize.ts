/**
 * ファイル名として使用できない特殊文字を除去し、安全なファイル名を生成する
 * @param title メモのタイトル
 * @returns サニタイズされたファイル名（拡張子なし）
 */
export function sanitizeFilename(title: string): string {
  const sanitized = title
    .replace(/[\/\\:*?"<>|]/g, '')  // Windows/Mac/Linuxで使用できない文字を除去
    .trim()                          // 前後の空白を削除
    .slice(0, 200);                  // 長さ制限（ファイルシステムの制限を考慮）

  // 空の場合はタイムスタンプ付きのデフォルト名を返す
  if (!sanitized) {
    return `無題のメモ_${Date.now()}`;
  }

  return sanitized;
}
