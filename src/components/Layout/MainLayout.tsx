import { useState, useRef, useEffect } from 'react';
import { Memo } from '../../types/memo';
import MarkdownEditor from '../Editor/MarkdownEditor';
import MarkdownPreview from '../Preview/MarkdownPreview';
import MarkdownHelp from '../Help/MarkdownHelp';
import {
  IoHelpCircle,
  IoAdd,
  IoPin,
  IoClose,
  IoSave,
  IoEye,
  IoEyeOff,
  IoPencil,
  IoReorderThreeOutline,
  IoChevronBackOutline,
  IoChevronForwardOutline,
  IoDocumentAttach
} from 'react-icons/io5';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import './MainLayout.css';

interface SortableItemProps {
  memo: Memo;
  currentMemo: Memo | null;
  onMemoSelect: (memo: Memo) => void;
  onTogglePin: (filename: string) => void;
  onDeleteMemo: (filename: string) => void;
}

function SortableItem({ memo, currentMemo, onMemoSelect, onTogglePin, onDeleteMemo }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: memo.filename });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`memo-item ${currentMemo?.filename === memo.filename ? 'active' : ''}`}
      onClick={() => onMemoSelect(memo)}
    >
      <div className="drag-handle" {...attributes} {...listeners}>
        <IoReorderThreeOutline />
      </div>
      <div className="memo-content">
        <div className="memo-title">
          {memo.pinned && <span className="pin-icon"><IoPin /></span>}
          {memo.title}
          <span className={`ext-badge ${memo.filename.endsWith('.txt') ? 'ext-txt' : 'ext-md'}`}>
            {memo.filename.endsWith('.txt') ? '.txt' : '.md'}
          </span>
        </div>
      </div>
      <div className="memo-actions">
        <button
          className={`btn-pin ${memo.pinned ? 'pinned' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(memo.filename);
          }}
          title={memo.pinned ? 'ピン留めを解除' : 'ピン留め'}
        >
          <IoPin />
        </button>
        <button
          className={`btn-delete ${memo.pinned ? 'disabled' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onDeleteMemo(memo.filename);
          }}
          title={memo.pinned ? 'ピン留めされているメモは削除できません' : '削除'}
        >
          <span className="delete-icon"><IoClose /></span>
          <span className="delete-text">削除</span>
        </button>
      </div>
    </div>
  );
}

interface MainLayoutProps {
  memos: Memo[];
  currentMemo: Memo | null;
  editingContent: string;
  onMemoSelect: (memo: Memo) => void;
  onContentChange: (content: string) => void;
  onCreateMemo: (extension: string) => void;
  onDeleteMemo: (filename: string) => void;
  onSave: () => void;
  onTitleChange: (newTitle: string) => void;
  onTogglePin: (filename: string) => void;
  onReorderMemos: (memos: Memo[]) => void;
  onImportMemo: () => void;
  onDropFiles: (files: File[]) => void;
}

function MainLayout({
  memos,
  currentMemo,
  editingContent,
  onMemoSelect,
  onContentChange,
  onCreateMemo,
  onDeleteMemo,
  onSave,
  onTitleChange,
  onTogglePin,
  onReorderMemos,
  onImportMemo,
  onDropFiles,
}: MainLayoutProps) {
  const [showPreview, setShowPreview] = useState(true);
  const [showEditor, setShowEditor] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [isListCollapsed, setIsListCollapsed] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const newMenuRef = useRef<HTMLDivElement>(null);

  // メニュー外クリックで閉じる
  useEffect(() => {
    if (!showNewMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setShowNewMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNewMenu]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = memos.findIndex(m => m.filename === active.id);
    const newIndex = memos.findIndex(m => m.filename === over.id);

    const draggedMemo = memos[oldIndex];
    const targetMemo = memos[newIndex];

    // ピン留め範囲の制限チェック
    if (draggedMemo.pinned !== targetMemo.pinned) {
      // ピン留めされているメモとそうでないメモ間の移動は許可しない
      return;
    }

    const newMemos = arrayMove(memos, oldIndex, newIndex);
    onReorderMemos(newMemos);
  };

  // .txtファイルはプレビュー非表示
  const isTxtFile = currentMemo?.filename.endsWith('.txt') ?? false;
  const effectiveShowPreview = showPreview && !isTxtFile;

  // エディタとプレビューの両方を非表示にできないようにする
  const handleToggleEditor = () => {
    if (showEditor && !effectiveShowPreview) {
      setShowPreview(true);
    }
    setShowEditor(!showEditor);
  };

  const handleTogglePreview = () => {
    if (showPreview && !showEditor) {
      setShowEditor(true);
    }
    setShowPreview(!showPreview);
  };

  return (
    <div className="main-layout">
      {/* 左ペイン: メモリスト（20%） */}
      <div className={`pane pane-left ${isListCollapsed ? 'pane-collapsed' : ''}`}>
        <div className="pane-header">
          {!isListCollapsed && <h2>MEMOリスト</h2>}
          <div className="header-buttons">
            {!isListCollapsed && (
              <>
                <button className="btn-help" onClick={() => setShowHelp(true)} title="マークダウンヘルプ">
                  <IoHelpCircle />
                </button>
                <button className="btn-import" onClick={onImportMemo} title="ファイルをインポート">
                  <IoDocumentAttach />
                </button>
                <div className="new-menu-wrapper" ref={newMenuRef}>
                  <button className="btn-new" onClick={() => setShowNewMenu(!showNewMenu)}>
                    <IoAdd /> New
                  </button>
                  {showNewMenu && (
                    <div className="new-menu">
                      <button onClick={() => { setShowEditor(true); onCreateMemo('md'); setShowNewMenu(false); }}>.md</button>
                      <button onClick={() => { setShowEditor(true); onCreateMemo('txt'); setShowNewMenu(false); }}>.txt</button>
                    </div>
                  )}
                </div>
              </>
            )}
            <button
              className="btn-collapse"
              onClick={() => setIsListCollapsed(!isListCollapsed)}
              title={isListCollapsed ? 'MEMOリストを表示' : 'MEMOリストを折りたたむ'}
            >
              {isListCollapsed ? <IoChevronForwardOutline /> : <IoChevronBackOutline />}
            </button>
          </div>
        </div>
        {!isListCollapsed && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={memos.map(m => m.filename)}
              strategy={verticalListSortingStrategy}
            >
              <div
                className={`memo-list ${isDragOver ? 'drag-over' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.types.includes('Files')) {
                    setIsDragOver(true);
                  }
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragOver(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragOver(false);
                  const files = Array.from(e.dataTransfer.files).filter(f =>
                    f.name.endsWith('.md') || f.name.endsWith('.txt')
                  );
                  if (files.length > 0) {
                    onDropFiles(files);
                  }
                }}
              >
                {memos.map((memo) => (
                  <SortableItem
                    key={memo.filename}
                    memo={memo}
                    currentMemo={currentMemo}
                    onMemoSelect={onMemoSelect}
                    onTogglePin={onTogglePin}
                    onDeleteMemo={onDeleteMemo}
                  />
                ))}
                {memos.length === 0 && (
                  <div className="empty-message">メモがありません</div>
                )}
                <div className="drop-placeholder">
                  ファイルをドラッグ&ドロップしてメモを追加
                </div>
                {isDragOver && (
                  <div className="drop-overlay">
                    <span>.md / .txt ファイルをドロップしてインポート</span>
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* エディタとプレビュー */}
      {showEditor && effectiveShowPreview ? (
        <PanelGroup orientation="horizontal" className="editor-preview-group">
          <Panel defaultSize={50} minSize={30}>
            <div className="pane pane-center">
              <div className="pane-header">
                {currentMemo ? (
                  <input
                    type="text"
                    className="title-input"
                    value={currentMemo.title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    placeholder="タイトルを入力..."
                  />
                ) : (
                  <h3>エディタ</h3>
                )}
                <div className="header-buttons">
                  {currentMemo && (
                    <button className="btn-save" onClick={onSave}>
                      <IoSave /> 保存
                    </button>
                  )}
                  <button
                    className="btn-toggle-preview"
                    onClick={handleToggleEditor}
                    title="プレビューモードに切り替え"
                  >
                    <IoEye /> プレビューモード
                  </button>
                </div>
              </div>
              <div className="editor-container">
                <MarkdownEditor
                  value={editingContent}
                  onChange={onContentChange}
                />
              </div>
            </div>
          </Panel>

          <PanelResizeHandle className="resize-handle" />

          <Panel defaultSize={50} minSize={30}>
            <div className="pane pane-right">
              <div className="pane-header">
                <h3>Mdプレビュー</h3>
                <div className="header-buttons">
                  <button
                    className="btn-toggle-preview"
                    onClick={handleTogglePreview}
                    title="プレビューを隠す"
                  >
                    <IoEyeOff /> 非表示
                  </button>
                </div>
              </div>
              <div className="preview-container">
                <MarkdownPreview content={editingContent} />
              </div>
            </div>
          </Panel>
        </PanelGroup>
      ) : showEditor ? (
        <div className="editor-preview-group">
          <div className="pane pane-center pane-expanded">
            <div className="pane-header">
              {currentMemo ? (
                <input
                  type="text"
                  className="title-input"
                  value={currentMemo.title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  placeholder="タイトルを入力..."
                />
              ) : (
                <h3>エディタ</h3>
              )}
              <div className="header-buttons">
                {currentMemo && (
                  <button className="btn-save" onClick={onSave}>
                    <IoSave /> 保存
                  </button>
                )}
                {!isTxtFile && (
                  <button
                    className="btn-toggle-preview"
                    onClick={handleToggleEditor}
                    title="プレビューモードに切り替え"
                  >
                    <IoEye /> プレビューモード
                  </button>
                )}
              </div>
            </div>
            <div className="editor-container">
              <MarkdownEditor
                value={editingContent}
                onChange={onContentChange}
              />
            </div>
          </div>
        </div>
      ) : effectiveShowPreview ? (
        <div className="editor-preview-group">
          <div className="pane pane-right pane-expanded">
            <div className="pane-header">
              <h3>Mdプレビュー</h3>
              <div className="header-buttons">
                <button
                  className="btn-toggle-preview"
                  onClick={handleToggleEditor}
                  title="編集モードに切り替え"
                >
                  <IoPencil /> 編集モード
                </button>
                <button
                  className="btn-toggle-preview"
                  onClick={handleTogglePreview}
                  title="プレビューを隠す"
                >
                  <IoEyeOff /> 非表示
                </button>
              </div>
            </div>
            <div className="preview-container">
              <MarkdownPreview content={editingContent} />
            </div>
          </div>
        </div>
      ) : null}

      {/* ヘルプモーダル */}
      <MarkdownHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}

export default MainLayout;
