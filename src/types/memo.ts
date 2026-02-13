export interface Memo {
  filename: string;    // ファイル名（例: "買い物リスト.md"）
  title: string;       // 表示用タイトル（例: "買い物リスト"）
  content: string;     // メモ本文
  createdAt: Date;     // 作成日時
  updatedAt: Date;     // 更新日時
  pinned: boolean;     // ピン留めされているか
  pinnedAt: Date | null; // ピン留めされた日時（ピン留めされていない場合はnull）
}
