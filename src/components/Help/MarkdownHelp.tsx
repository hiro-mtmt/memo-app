import './MarkdownHelp.css';

interface MarkdownHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

function MarkdownHelp({ isOpen, onClose }: MarkdownHelpProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📖 マークダウン記法リファレンス</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <section>
            <h3>見出し</h3>
            <pre><code>{`# 見出し1（最大）
## 見出し2
### 見出し3
#### 見出し4
##### 見出し5
###### 見出し6（最小）`}</code></pre>
          </section>

          <section>
            <h3>テキスト装飾</h3>
            <pre><code>{`**太字（ボールド）**
*斜体（イタリック）*
***太字と斜体***
~~取り消し線~~
\`インラインコード\``}</code></pre>
          </section>

          <section>
            <h3>リスト</h3>
            <h4>箇条書き（順序なし）</h4>
            <pre><code>{`- 項目1
- 項目2
  - サブ項目2-1
  - サブ項目2-2
- 項目3`}</code></pre>

            <h4>番号付きリスト（順序あり）</h4>
            <pre><code>{`1. 最初の項目
2. 2番目の項目
3. 3番目の項目`}</code></pre>

            <h4>タスクリスト</h4>
            <pre><code>{`- [ ] 未完了のタスク
- [x] 完了したタスク`}</code></pre>
          </section>

          <section>
            <h3>リンクと画像</h3>
            <pre><code>{`[リンクテキスト](https://example.com)
![画像の代替テキスト](画像URL)`}</code></pre>
          </section>

          <section>
            <h3>引用</h3>
            <pre><code>{`> これは引用です
> 複数行にわたって
> 引用できます`}</code></pre>
          </section>

          <section>
            <h3>コードブロック</h3>
            <pre><code>{`\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

\`\`\`python
def hello():
    print("Hello, World!")
\`\`\``}</code></pre>
          </section>

          <section>
            <h3>水平線</h3>
            <pre><code>{`---
***
___`}</code></pre>
          </section>

          <section>
            <h3>テーブル</h3>
            <pre><code>{`| 列1 | 列2 | 列3 |
| --- | --- | --- |
| データ1 | データ2 | データ3 |
| データ4 | データ5 | データ6 |

// 列の配置指定
| 左寄せ | 中央 | 右寄せ |
| :--- | :---: | ---: |
| データ | データ | データ |`}</code></pre>
          </section>

          <section>
            <h3>改行</h3>
            <pre><code>{`行末にスペース2つで改行
2行目（改行される）

新しい段落（空行で分離）`}</code></pre>
          </section>

          <section>
            <h3>実用例</h3>
            <pre><code>{`# 会議メモ 2024-01-15

## 出席者
- 田中さん
- 佐藤さん

## 決定事項
- [ ] APIの設計書を**金曜日までに**作成
- [x] デザインレビュー完了

## 参考リンク
[プロジェクト管理](https://example.com)

---

**次回**: 2024-01-22 14:00`}</code></pre>
          </section>
        </div>

        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}

export default MarkdownHelp;
