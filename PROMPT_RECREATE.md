# メモアプリ再現プロンプト（Claude Code向け）

以下のプロンプトを順番に投げることで、現在のメモアプリを0から再現できます。

---

## プロンプト1: プロジェクト初期化

```
Tauri v1 + React 19 + TypeScript + Vite でデスクトップメモアプリを作成してください。

### 技術スタック
- フロントエンド: React 19, TypeScript, Vite
- バックエンド: Tauri v1 (Rust)
- エディタ: @uiw/react-codemirror + @codemirror/lang-markdown
- プレビュー: react-markdown + remark-gfm（GitHub風スタイル）
- アイコン: react-icons/io5
- ドラッグ&ドロップ: @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
- パネルリサイズ: react-resizable-panels
- Rust側追加crate: chrono (serde feature), dirs, serde_json

### プロジェクト構成
memo-app/
├── src/
│   ├── App.tsx                        # メインコンポーネント
│   ├── main.tsx                       # エントリポイント
│   ├── types/
│   │   └── memo.ts                    # Memo型定義
│   ├── services/
│   │   ├── fileService.ts             # Tauri IPC呼び出し
│   │   └── tauriTypes.ts             # Rust応答型定義
│   ├── hooks/
│   │   ├── useMemos.ts               # メモCRUDフック
│   │   └── useAutoSave.ts            # 自動保存フック
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── MainLayout.tsx         # 3ペインレイアウト
│   │   │   └── MainLayout.css
│   │   ├── Editor/
│   │   │   └── MarkdownEditor.tsx     # CodeMirrorエディタ
│   │   ├── Preview/
│   │   │   ├── MarkdownPreview.tsx     # マークダウンプレビュー
│   │   │   └── MarkdownPreview.css    # GitHub風プレビューCSS
│   │   └── Help/
│   │       ├── MarkdownHelp.tsx        # ヘルプモーダル
│   │       └── MarkdownHelp.css
│   └── styles/
│       └── global.css                 # グローバルスタイル
└── src-tauri/
    └── src/
        ├── main.rs                    # Tauriエントリ + メニュー
        ├── commands/
        │   ├── mod.rs
        │   ├── memo.rs                # メモ操作コマンド
        │   └── config.rs             # 設定管理コマンド
        └── utils/
            ├── mod.rs
            └── paths.rs               # パスユーティリティ

まずプロジェクトの初期化とディレクトリ構造を作成してください。tauri.conf.json の window設定は fileDropEnabled: false にしてください（フロントエンド側でドロップを制御するため）。
```

---

## プロンプト2: Rust バックエンド

```
Rustバックエンドを実装してください。

### 設定管理 (config.rs)
- AppConfig構造体: memo_directory (String), auto_save_delay (u32)
- デフォルト保存先: ~/Documents/Memos/
- デフォルト自動保存遅延: 1000ms
- 設定ファイル: ~/.memo-app/config.json
- コマンド: get_config, save_config, update_config（部分更新）
- serde rename_all = "camelCase"

### パスユーティリティ (paths.rs)
- get_home_dir(): dirs::home_dir()を使用
- get_config_dir(): ~/.memo-app
- get_config_file(): ~/.memo-app/config.json
- ensure_dir_exists(): ディレクトリ作成
- sanitize_filename(): ファイル名に使えない文字を除去、空ならタイムスタンプ付きデフォルト名、最大200文字

### メモ操作 (memo.rs)
MemoMetadata構造体（serde rename_all = "camelCase"）:
  filename, title, content, created_at, updated_at, pinned, pinned_at

メモデータの保存方式:
- メモ本文: memo_directory直下に {タイトル}.md or {タイトル}.txt として保存
- ピン情報: memo_directory/.pins.json（HashMap<filename, PinData>）
- 並び順: memo_directory/.order.json（HashMap<filename, index>）

Tauriコマンド:
1. list_memos: .md と .txt の両方を読み込み、ピン→非ピンの順、各グループ内は.order.jsonの順序。未登録ファイルがあれば.order.jsonに自動追記
2. read_memo: 単一メモ読み込み
3. save_memo(title, content, old_filename): タイトルからファイル名生成。拡張子はold_filenameから取得（なければ.md）。ファイル名変更時は旧ファイル削除＋.order.json内の位置を引き継ぐ
4. delete_memo: ファイル削除
5. create_memo(extension: Option<String>): 「新しいメモ_{timestamp}.{ext}」で空ファイル作成
6. toggle_pin: ピン状態トグル、.pins.jsonに保存
7. update_memo_order: ファイル名リストから.order.json更新
8. import_memo_from_dialog: ファイル選択ダイアログ（.md, .txt）、選択ファイルをmemo_dirにコピー。重複時は_1, _2を付与
9. import_memo_from_content(original_filename, content): D&Dインポート用。拡張子をoriginal_filenameから取得

ヘルパー関数:
- resolve_unique_filename(memo_dir, base_name, ext): 重複回避
- build_memo_metadata(path, filename): メタデータ構築
- import_single_file(source_path): ファイルインポート

タイトル抽出: filename.trim_end_matches(".md").trim_end_matches(".txt")
```

---

## プロンプト3: Tauri メニューとズーム

```
src-tauri/src/main.rs にカスタムメニューを追加してください。

### Editメニュー
Undo, Redo, Separator, Cut, Copy, Paste, SelectAll（全てMenuItem native）

### Viewメニュー
- Zoom In: CustomMenuItem, accelerator "CmdOrCtrl+="
- Zoom Out: CustomMenuItem, accelerator "CmdOrCtrl+-"
- Actual Size: CustomMenuItem, accelerator "CmdOrCtrl+0"

### メニューイベント
zoom_in/zoom_out/zoom_reset イベント発生時、window.emit("zoom", payload) でフロントエンドに通知。
payloadは "in", "out", "reset"。

### フロントエンド側ズーム処理（App.tsx）
- listen<string>('zoom', ...) でイベント受信
- zoomLevel変数を0.1刻みで増減（範囲: 0.5〜2.0）
- CSSのzoomプロパティを .cm-editor と .markdown-preview に適用
- ページ全体ではなく、エディタとプレビューのコンテンツ部分のみズーム
```

---

## プロンプト4: フロントエンドサービス層

```
フロントエンドのサービス層とカスタムフックを実装してください。

### tauriTypes.ts
RustのMemoMetadataに対応する型。日時はstringで受け取る。

### fileService.ts
Tauri invoke() でRustコマンドを呼び出すラッパー関数群:
- loadMemos(): list_memos呼び出し、日時をDateに変換
- loadMemo(filename): read_memo呼び出し
- saveMemo(title, content, oldFilename?): save_memo呼び出し、新ファイル名を返す
- deleteMemo(filename): delete_memo呼び出し
- createMemo(extension = 'md'): create_memo呼び出し
- togglePin(filename): toggle_pin呼び出し
- updateMemoOrder(filenames): update_memo_order呼び出し
- importMemosFromDialog(): import_memo_from_dialog呼び出し
- importMemoFromContent(originalFilename, content): import_memo_from_content呼び出し

### useMemos.ts フック
- memos状態管理、loadAllMemos、createMemo（ピン数の直後に挿入）、deleteMemo、reloadMemos
- importFromDialog: ダイアログインポート後にリスト再読込
- importFromDrop: D&Dインポート後にリスト再読込

### useAutoSave.ts フック
- currentMemo と editingContent を監視
- 内容変更時にデバウンス（delay ms、デフォルト1000ms）で自動保存
- ファイル名変更時はonSavedコールバックで通知
- previousContentRef でメモ切替時にリセット
- 空内容は保存しない
```

---

## プロンプト5: UIコンポーネント

```
UIコンポーネントを実装してください。

### Memo型 (types/memo.ts)
filename, title, content, createdAt(Date), updatedAt(Date), pinned(boolean), pinnedAt(Date|null)

### MarkdownEditor.tsx
- @uiw/react-codemirror使用
- markdown()拡張
- basicSetup: lineNumbers, highlightActiveLineGutter, highlightActiveLine, foldGutter
- fontSize: 14px, height: 100%

### MarkdownPreview.tsx
- react-markdown + remarkGfm
- GitHub風CSSスタイル（h1-h6, p, ul/ol, code, pre, blockquote, table, a, strong, em, hr）
- 空の場合「プレビューがここに表示されます」を表示

### MarkdownHelp.tsx
マークダウン記法のリファレンスモーダル。見出し、テキスト装飾、リスト（箇条書き・番号付き・タスクリスト）、リンクと画像、引用、コードブロック、水平線、テーブル、改行、実用例のセクション。オーバーレイクリックで閉じる。

### MainLayout.tsx（3ペインレイアウト）
左ペイン（20%幅、折りたたみ可能）:
  - ヘッダー: "MEMOリスト"タイトル、ヘルプボタン(黄色丸)、インポートボタン(水色丸)、Newボタン(青)
  - Newボタン: クリックでドロップダウン表示、.md と .txt の選択肢、メニュー外クリックで閉じる(useRef+useEffect)
  - メモリスト: @dnd-kit でドラッグ&ドロップ並べ替え（ピン同士/非ピン同士のみ移動可）
  - 各メモアイテム: ドラッグハンドル(IoReorderThreeOutline) + タイトル + 拡張子バッジ(.md青/.txt灰) + ピンボタン + 削除ボタン
  - 拡張子バッジ: タイトルの右にインラインで表示、10px、position: relative; top: 2px;
  - ドラッグ&ドロップインポート: .md/.txtファイルをリストにドロップでインポート
  - 折りたたみ: IoChevronBack/Forwardアイコンで50pxに縮小
  - 空メッセージ: 「メモがありません」

中央ペイン（エディタ）:
  - タイトル入力フィールド（inputタグ、透明ボーダー、ホバーで表示）
  - 保存ボタン（緑、IoSave）
  - プレビューモード切替ボタン

右ペイン（プレビュー）:
  - "Mdプレビュー"タイトル
  - 非表示ボタン
  - 編集モード切替ボタン（プレビューのみ表示時）

パネル配置:
  - エディタ+プレビュー両方表示時: react-resizable-panels で50:50リサイズ可能
  - 片方のみ表示時: フル幅表示
  - エディタとプレビューの両方が非表示にならないよう制御

.txtファイル時の振る舞い:
  - プレビューパネルを非表示にする（effectiveShowPreview = showPreview && !isTxtFile）
  - プレビューモード切替ボタンも非表示にする

### App.tsx
- useMemos + useAutoSave フック使用
- メモ選択時: 現在のメモに未保存変更があれば先に保存してから切替
- タイトル変更検出: memosリストからオリジナルのタイトルと比較
- 手動保存時: saveMessage状態でトースト表示（2秒で自動消去）
- ピン留めメモは削除不可（alert表示）
- 削除確認はconfirmダイアログ
- D&Dインポート: FileReaderでテキスト読み取り → importFromDrop
- ズームイベントリスナー

### グローバルCSS
- リセットCSS
- カスタムスクロールバー（8px、灰色）
- 保存トースト: position fixed, top 20%, 中央配置、緑背景、2秒フェードアニメーション
```

---

## 実装時の注意点

1. **Tauri v1を使用すること**（v2ではない）。`@tauri-apps/api`のimportは`@tauri-apps/api/tauri`から`invoke`、`@tauri-apps/api/event`から`listen`
2. **tauri.conf.json の dialog feature**: `tauri`の`features`に`"dialog"`を追加（Cargo.toml側）
3. **fileDropEnabled: false**: tauri.conf.jsonのwindow設定で無効化（フロントエンドで制御するため）
4. **serde rename_all = "camelCase"**: Rust構造体のフィールド名をcamelCaseでシリアライズ
5. **日時のやり取り**: RustからはISO 8601文字列で送り、フロントエンドでDateに変換
6. **.pins.json と .order.json**: メモディレクトリ直下のドットファイルとして管理
7. **拡張子の保持**: save_memo時にold_filenameから拡張子を取得して保持する
8. **ピンメモの制約**: ピン同士/非ピン同士のドラッグ移動のみ許可、ピンメモは削除不可
