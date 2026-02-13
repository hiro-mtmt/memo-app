/**
 * メモの内容から先頭行を抽出してタイトルとして使用する
 * マークダウンの見出し記号（#）は除去する
 * @param content メモの本文
 * @returns タイトル文字列
 */
export function extractTitle(content: string): string {
  if (!content) {
    return '';
  }

  // 先頭行を取得
  const firstLine = content.split('\n')[0].trim();

  // マークダウンの見出し記号（# ## ### など）を除去
  const title = firstLine.replace(/^#+\s*/, '').trim();

  return title || '無題';
}
