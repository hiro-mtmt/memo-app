import { useEffect, useRef } from 'react';
import { Memo } from '../types/memo';
import { saveMemo } from '../services/fileService';

interface UseAutoSaveOptions {
  delay?: number; // 自動保存の遅延時間（ms）デフォルト: 1000
}

export function useAutoSave(
  currentMemo: Memo | null,
  editingContent: string,
  onSaved?: (newFilename: string) => void,
  options: UseAutoSaveOptions = {}
) {
  const { delay = 1000 } = options;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousContentRef = useRef<string>('');

  useEffect(() => {
    // メモが選択されていない場合は何もしない
    if (!currentMemo) {
      return;
    }

    // 内容が変更されていない場合は何もしない
    if (editingContent === previousContentRef.current) {
      return;
    }

    // 空の内容の場合は保存しない
    if (!editingContent.trim()) {
      return;
    }

    // 前回のタイマーをクリア
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // デバウンス処理で自動保存
    timeoutRef.current = setTimeout(async () => {
      try {
        const title = currentMemo.title || '無題';
        const newFilename = await saveMemo(title, editingContent, currentMemo.filename);

        // ファイル名が変更された場合は親に通知
        if (newFilename !== currentMemo.filename && onSaved) {
          onSaved(newFilename);
        }

        previousContentRef.current = editingContent;
        console.log('自動保存完了:', newFilename);
      } catch (error) {
        console.error('自動保存に失敗しました:', error);
      }
    }, delay);

    // クリーンアップ
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentMemo, editingContent, delay, onSaved]);

  // メモが切り替わったら previousContentRef をリセット
  useEffect(() => {
    if (currentMemo) {
      previousContentRef.current = currentMemo.content;
    }
  }, [currentMemo?.filename]);
}
