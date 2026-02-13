import { useState, useEffect } from 'react';
import { Memo } from '../types/memo';
import { loadMemos, createMemo, deleteMemo as deleteFile, importMemosFromDialog, importMemoFromContent } from '../services/fileService';

export function useMemos() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);

  // 初回読み込み
  useEffect(() => {
    loadAllMemos();
  }, []);

  // メモ一覧を読み込む
  const loadAllMemos = async () => {
    setLoading(true);
    try {
      const loadedMemos = await loadMemos();
      setMemos(loadedMemos);
    } catch (error) {
      console.error('メモの読み込みに失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  // 新規メモを作成
  const handleCreateMemo = async (extension: string = 'md') => {
    try {
      const newMemo = await createMemo(extension);
      setMemos((prev) => {
        const pinnedCount = prev.filter((m) => m.pinned).length;
        const next = [...prev];
        next.splice(pinnedCount, 0, newMemo);
        return next;
      });
      return newMemo;
    } catch (error) {
      console.error('メモの作成に失敗しました:', error);
      throw error;
    }
  };

  // メモを削除
  const handleDeleteMemo = async (filename: string) => {
    try {
      await deleteFile(filename);
      setMemos((prev) => prev.filter((m) => m.filename !== filename));
    } catch (error) {
      console.error('メモの削除に失敗しました:', error);
      throw error;
    }
  };

  // メモ一覧を再読み込み
  const reloadMemos = async () => {
    await loadAllMemos();
  };

  // ファイルダイアログからインポート
  const handleImportFromDialog = async (): Promise<Memo | null> => {
    try {
      const imported = await importMemosFromDialog();
      if (imported.length > 0) {
        await loadAllMemos();
        return imported[0];
      }
      return null;
    } catch (error) {
      console.error('インポートに失敗しました:', error);
      throw error;
    }
  };

  // ドラッグ&ドロップからインポート
  const handleImportFromDrop = async (
    originalFilename: string,
    content: string
  ): Promise<Memo> => {
    try {
      const imported = await importMemoFromContent(originalFilename, content);
      await loadAllMemos();
      return imported;
    } catch (error) {
      console.error('インポートに失敗しました:', error);
      throw error;
    }
  };

  return {
    memos,
    loading,
    createMemo: handleCreateMemo,
    deleteMemo: handleDeleteMemo,
    reloadMemos,
    importFromDialog: handleImportFromDialog,
    importFromDrop: handleImportFromDrop,
  };
}
