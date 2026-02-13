import { invoke } from '@tauri-apps/api/tauri';
import { Memo } from '../types/memo';
import { MemoMetadata } from './tauriTypes';

/**
 * すべてのメモを読み込む
 */
export async function loadMemos(): Promise<Memo[]> {
  try {
    const memos = await invoke<MemoMetadata[]>('list_memos');
    return memos.map(memo => ({
      ...memo,
      createdAt: new Date(memo.createdAt),
      updatedAt: new Date(memo.updatedAt),
      pinnedAt: memo.pinnedAt ? new Date(memo.pinnedAt) : null
    }));
  } catch (error) {
    console.error('メモの読み込みに失敗しました:', error);
    return [];
  }
}

/**
 * 特定のメモを読み込む
 */
export async function loadMemo(filename: string): Promise<Memo | null> {
  try {
    const memo = await invoke<MemoMetadata>('read_memo', { filename });
    return {
      ...memo,
      createdAt: new Date(memo.createdAt),
      updatedAt: new Date(memo.updatedAt),
      pinnedAt: memo.pinnedAt ? new Date(memo.pinnedAt) : null
    };
  } catch (error) {
    console.error(`メモ "${filename}" の読み込みに失敗しました:`, error);
    return null;
  }
}

/**
 * メモを保存する
 * タイトルが変更された場合は古いファイルを削除して新しいファイルを作成する
 */
export async function saveMemo(
  title: string,
  content: string,
  oldFilename?: string
): Promise<string> {
  try {
    const newFilename = await invoke<string>('save_memo', {
      title,
      content,
      oldFilename: oldFilename || null
    });
    return newFilename;
  } catch (error) {
    console.error('メモの保存に失敗しました:', error);
    throw error;
  }
}

/**
 * メモを削除する
 */
export async function deleteMemo(filename: string): Promise<void> {
  try {
    await invoke('delete_memo', { filename });
  } catch (error) {
    console.error(`メモ "${filename}" の削除に失敗しました:`, error);
    throw error;
  }
}

/**
 * 新しいメモを作成する
 */
export async function createMemo(extension: string = 'md'): Promise<Memo> {
  try {
    const memo = await invoke<MemoMetadata>('create_memo', { extension });
    return {
      ...memo,
      createdAt: new Date(memo.createdAt),
      updatedAt: new Date(memo.updatedAt),
      pinnedAt: memo.pinnedAt ? new Date(memo.pinnedAt) : null
    };
  } catch (error) {
    console.error('メモの作成に失敗しました:', error);
    throw error;
  }
}

/**
 * メモのピン状態を切り替える
 */
export async function togglePin(filename: string): Promise<boolean> {
  try {
    const isPinned = await invoke<boolean>('toggle_pin', { filename });
    return isPinned;
  } catch (error) {
    console.error(`メモ "${filename}" のピン切り替えに失敗しました:`, error);
    throw error;
  }
}

/**
 * メモの順序を更新する
 */
export async function updateMemoOrder(filenames: string[]): Promise<void> {
  try {
    await invoke('update_memo_order', { filenames });
  } catch (error) {
    console.error('メモの順序更新に失敗しました:', error);
    throw error;
  }
}

/**
 * ファイル選択ダイアログからメモをインポートする
 */
export async function importMemosFromDialog(): Promise<Memo[]> {
  try {
    const memos = await invoke<MemoMetadata[]>('import_memo_from_dialog');
    return memos.map(memo => ({
      ...memo,
      createdAt: new Date(memo.createdAt),
      updatedAt: new Date(memo.updatedAt),
      pinnedAt: memo.pinnedAt ? new Date(memo.pinnedAt) : null
    }));
  } catch (error) {
    console.error('ファイルのインポートに失敗しました:', error);
    throw error;
  }
}

/**
 * ドラッグ&ドロップでメモをインポートする
 */
export async function importMemoFromContent(
  originalFilename: string,
  content: string
): Promise<Memo> {
  try {
    const memo = await invoke<MemoMetadata>('import_memo_from_content', {
      originalFilename,
      content,
    });
    return {
      ...memo,
      createdAt: new Date(memo.createdAt),
      updatedAt: new Date(memo.updatedAt),
      pinnedAt: memo.pinnedAt ? new Date(memo.pinnedAt) : null
    };
  } catch (error) {
    console.error('ファイルのインポートに失敗しました:', error);
    throw error;
  }
}
