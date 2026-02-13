import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { Memo } from './types/memo';
import MainLayout from './components/Layout/MainLayout';
import { useMemos } from './hooks/useMemos';
import { useAutoSave } from './hooks/useAutoSave';
import { saveMemo, togglePin, updateMemoOrder } from './services/fileService';

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'utf-8');
  });
}

function App() {
  const { memos, createMemo, deleteMemo, reloadMemos, importFromDialog, importFromDrop } = useMemos();
  const [currentMemo, setCurrentMemo] = useState<Memo | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [saveMessage, setSaveMessage] = useState(false);

  // ズームイン・ズームアウト (Cmd+/Cmd-) - Tauriメニューイベント経由
  useEffect(() => {
    let zoomLevel = 1;
    const applyZoom = () => {
      document.querySelectorAll('.editor-container .cm-editor, .preview-container .markdown-preview').forEach((el) => {
        (el as HTMLElement).style.zoom = `${zoomLevel}`;
      });
    };
    let unlisten: (() => void) | undefined;
    listen<string>('zoom', (event) => {
      if (event.payload === 'in') {
        zoomLevel = Math.min(zoomLevel + 0.1, 2);
      } else if (event.payload === 'out') {
        zoomLevel = Math.max(zoomLevel - 0.1, 0.5);
      } else if (event.payload === 'reset') {
        zoomLevel = 1;
      }
      applyZoom();
    }).then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, []);

  // 自動保存機能
  useAutoSave(currentMemo, editingContent, async (newFilename) => {
    // ファイル名が変更された場合はメモリストを再読み込み
    await reloadMemos();
    // 現在のメモのファイル名を更新
    if (currentMemo) {
      setCurrentMemo({ ...currentMemo, filename: newFilename });
    }
  });

  // 新規メモ作成
  const handleCreateMemo = async (extension: string = 'md') => {
    const newMemo = await createMemo(extension);
    setCurrentMemo(newMemo);
    setEditingContent(newMemo.content);
  };

  // メモ削除
  const handleDeleteMemo = async (filename: string) => {
    // ピン留めされているメモは削除できない
    const memo = memos.find(m => m.filename === filename);
    if (memo?.pinned) {
      alert('ピン留めされているメモは削除できません。\n先にピン留めを解除してください。');
      return;
    }

    if (confirm('このメモを削除しますか？')) {
      await deleteMemo(filename);
      // 削除したメモが選択中だった場合はクリア
      if (currentMemo?.filename === filename) {
        setCurrentMemo(null);
        setEditingContent('');
      }
    }
  };

  // 手動保存
  const handleSave = async () => {
    if (!currentMemo) return;

    try {
      const title = currentMemo.title || '無題';
      const newFilename = await saveMemo(title, editingContent, currentMemo.filename);

      // ファイル名が変更された場合は更新
      if (newFilename !== currentMemo.filename) {
        setCurrentMemo({ ...currentMemo, filename: newFilename });
      }

      // メモリストを再読み込み
      await reloadMemos();

      // 保存完了ポップアップ
      setSaveMessage(true);
      setTimeout(() => setSaveMessage(false), 2000);
    } catch (error) {
      console.error('保存に失敗しました:', error);
      alert('保存に失敗しました');
    }
  };

  // タイトル変更
  const handleTitleChange = (newTitle: string) => {
    if (!currentMemo) return;

    // タイトルのみ更新（本文は変更しない）
    setCurrentMemo({ ...currentMemo, title: newTitle });
  };

  // ファイルダイアログからインポート
  const handleImportMemo = async () => {
    try {
      const imported = await importFromDialog();
      if (imported) {
        setCurrentMemo(imported);
        setEditingContent(imported.content);
      }
    } catch (error) {
      console.error('インポートに失敗しました:', error);
      alert('ファイルのインポートに失敗しました');
    }
  };

  // ドラッグ&ドロップからインポート
  const handleDropFiles = async (files: File[]) => {
    try {
      let lastImported: Memo | null = null;
      for (const file of files) {
        const content = await readFileAsText(file);
        lastImported = await importFromDrop(file.name, content);
      }
      if (lastImported) {
        setCurrentMemo(lastImported);
        setEditingContent(lastImported.content);
      }
    } catch (error) {
      console.error('ドロップインポートに失敗しました:', error);
      alert('ファイルのインポートに失敗しました');
    }
  };

  // メモ選択
  const handleMemoSelect = async (memo: Memo) => {
    // 現在のメモを保存してから切り替え（リロードはしない、順番が変わるため）
    if (currentMemo) {
      const originalMemo = memos.find(m => m.filename === currentMemo.filename);
      const contentChanged = editingContent !== currentMemo.content;
      const titleChanged = originalMemo && currentMemo.title !== originalMemo.title;
      if (contentChanged || titleChanged) {
        try {
          const title = currentMemo.title || '無題';
          await saveMemo(title, editingContent, currentMemo.filename);
          await reloadMemos();
        } catch (error) {
          console.error('メモの保存に失敗しました:', error);
        }
      }
    }

    // 新しいメモに切り替え
    setCurrentMemo(memo);
    setEditingContent(memo.content);
  };

  // ピン留め切り替え
  const handleTogglePin = async (filename: string) => {
    try {
      await togglePin(filename);
      await reloadMemos();
    } catch (error) {
      console.error('ピン留めの切り替えに失敗しました:', error);
    }
  };

  // メモの順序変更
  const handleReorderMemos = async (newMemos: Memo[]) => {
    try {
      const filenames = newMemos.map(m => m.filename);
      await updateMemoOrder(filenames);
      await reloadMemos();
    } catch (error) {
      console.error('メモの順序変更に失敗しました:', error);
    }
  };

  return (
    <>
    {saveMessage && <div className="save-toast">保存しました</div>}
    <MainLayout
      memos={memos}
      currentMemo={currentMemo}
      editingContent={editingContent}
      onMemoSelect={handleMemoSelect}
      onContentChange={setEditingContent}
      onCreateMemo={handleCreateMemo}
      onDeleteMemo={handleDeleteMemo}
      onSave={handleSave}
      onTitleChange={handleTitleChange}
      onTogglePin={handleTogglePin}
      onReorderMemos={handleReorderMemos}
      onImportMemo={handleImportMemo}
      onDropFiles={handleDropFiles}
    />
    </>
  );
}

export default App;
