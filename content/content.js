/**
 * Gemini Prompt Snippets - コンテンツスクリプト
 * Geminiのチャット画面にスニペットボタンを挿入し、プロンプトの挿入機能を提供
 */

// 定数定義
const CONSTANTS = {
    CONTAINER_ID: 'gemini-snippet-container',
    SELECTORS: {
        INPUT_CONTAINER: 'input-container',
        INPUT_AREA_CONTAINER: '.input-area-container',
        INPUT_AREA_V2: 'input-area-v2',
        EDITOR: 'div.ql-editor',
        TEXTAREA_WRAPPER: '.text-input-field_textarea-wrapper',
        RICH_TEXTAREA: 'rich-textarea'
    },
    CLASSES: {
        SNIPPET_BUTTON: 'snippet-button'
    },
    STORAGE_KEY: 'snippets'
};

/**
 * スニペット管理クラス
 */
class SnippetManager {
    constructor() {
        this.snippetsContainer = null;
        this.observer = null;
        this.init();
    }

    /**
     * 初期化処理
     */
    init() {
        this.setupMutationObserver();
        this.setupStorageListener();
    }

    /**
     * MutationObserverの設定
     * Geminiのページは動的に読み込まれるため、DOMの変更を監視
     */
    setupMutationObserver() {
        this.observer = new MutationObserver((mutations, obs) => {
            const inputArea = document.querySelector(CONSTANTS.SELECTORS.INPUT_AREA_V2);
            if (inputArea) {
                this.createSnippetButtons();
            }
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    /**
     * ストレージの変更を監視
     * ポップアップでスニペットが追加/削除された場合に自動更新
     */
    setupStorageListener() {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'sync' && changes[CONSTANTS.STORAGE_KEY]) {
                if (this.snippetsContainer) {
                    this.loadSnippetsAndCreateButtons();
                }
            }
        });
    }

    /**
     * スニペットボタンコンテナを作成・挿入
     */
    createSnippetButtons() {
        // 既に挿入済みの場合はスキップ
        if (document.getElementById(CONSTANTS.CONTAINER_ID)) {
            return;
        }

        const targetArea = document.querySelector(CONSTANTS.SELECTORS.INPUT_CONTAINER);
        if (!targetArea) {
            console.warn('入力コンテナが見つかりません');
            return;
        }
        
        // ボタンコンテナを作成
        this.snippetsContainer = document.createElement('div');
        this.snippetsContainer.id = CONSTANTS.CONTAINER_ID;

        // スニペットを読み込んでボタンを作成
        this.loadSnippetsAndCreateButtons();
        
        // 入力エリアの最後に挿入
        const inputAreaContainer = targetArea.querySelector(CONSTANTS.SELECTORS.INPUT_AREA_CONTAINER);
        if (inputAreaContainer) {
            inputAreaContainer.appendChild(this.snippetsContainer);
        } else {
            console.error('入力エリアコンテナが見つかりません');
        }
    }

    /**
     * ストレージからスニペットを読み込み、ボタンを作成
     */
    loadSnippetsAndCreateButtons() {
        if (!this.snippetsContainer) {
            console.warn('スニペットコンテナが初期化されていません');
            return;
        }

        chrome.storage.sync.get({ [CONSTANTS.STORAGE_KEY]: [] }, (data) => {
            try {
                // コンテナをクリア
                this.snippetsContainer.innerHTML = '';
                
                const snippets = data[CONSTANTS.STORAGE_KEY];
                
                // 各スニペットに対してボタンを作成
                snippets.forEach((snippet) => {
                    this.createSnippetButton(snippet);
                });
            } catch (error) {
                console.error('スニペットの読み込みエラー:', error);
            }
        });
    }

    /**
     * 個別のスニペットボタンを作成
     * @param {Object} snippet - スニペットオブジェクト
     */
    createSnippetButton(snippet) {
        const button = document.createElement('button');
        button.className = CONSTANTS.CLASSES.SNIPPET_BUTTON;
        button.textContent = snippet.title;
        button.title = snippet.text; // ツールチップとしてフルテキストを表示

        button.addEventListener('click', () => {
            this.insertTextIntoGemini(snippet.text);
        });

        this.snippetsContainer.appendChild(button);
    }

    /**
     * Geminiのエディタにテキストを挿入
     * @param {string} text - 挿入するテキスト
     */
    insertTextIntoGemini(text) {
        const editor = document.querySelector(CONSTANTS.SELECTORS.EDITOR);
        if (!editor) {
            console.error('Geminiエディタが見つかりません');
            return;
        }
        
        try {
            // 既存のコンテンツをクリア
            editor.innerHTML = '';
            
            // 改行ごとに段落を作成して挿入
            const lines = text.split('\n');
            lines.forEach(line => {
                const p = document.createElement('p');
                // 空行はGeminiでは<br>として表現
                if (line.trim() === '') {
                    p.innerHTML = '<br>';
                } else {
                    p.textContent = line;
                }
                editor.appendChild(p);
            });

            // 最後に2行の改行を追加
            editor.innerHTML += '<br><br>';
            
            // エディタにフォーカスを設定し、変更を通知
            this.focusEditorAndNotifyChange(editor);
            
            // カーソルを最後に配置
            this.setCursorToEnd(editor);

            // テキストエリアの高さを調整
            this.adjustTextareaHeight();
        } catch (error) {
            console.error('テキスト挿入エラー:', error);
        }
    }

    /**
     * エディタにフォーカスを設定し、変更イベントを発火
     * @param {HTMLElement} editor - エディタ要素
     */
    focusEditorAndNotifyChange(editor) {
        editor.focus();
        editor.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    }

    /**
     * カーソルをエディタの最後に配置
     * @param {HTMLElement} editor - エディタ要素
     */
    setCursorToEnd(editor) {
        const range = document.createRange();
        const selection = window.getSelection();
        
        if (editor.lastChild) {
            // 最後の子要素の種類に応じて適切な位置を設定
            if (editor.lastChild.nodeType === Node.TEXT_NODE) {
                // テキストノードの場合
                range.setStart(editor.lastChild, editor.lastChild.textContent.length);
                range.setEnd(editor.lastChild, editor.lastChild.textContent.length);
            } else {
                // 要素ノードの場合
                const lastElement = editor.lastChild;
                if (lastElement.childNodes.length > 0) {
                    const lastNode = lastElement.childNodes[lastElement.childNodes.length - 1];
                    if (lastNode.nodeType === Node.TEXT_NODE) {
                        range.setStart(lastNode, lastNode.textContent.length);
                        range.setEnd(lastNode, lastNode.textContent.length);
                    } else {
                        range.selectNodeContents(lastElement);
                        range.collapse(false);
                    }
                } else {
                    range.selectNodeContents(lastElement);
                    range.collapse(false);
                }
            }
        } else {
            // エディタが空の場合
            range.selectNodeContents(editor);
            range.collapse(false);
        }
        
        // 選択範囲を適用
        selection.removeAllRanges();
        selection.addRange(range);
    }

    /**
     * テキストエリアの高さを調整
     */
    adjustTextareaHeight() {
        const textareaWrapper = document.querySelector(CONSTANTS.SELECTORS.TEXTAREA_WRAPPER);
        const richTextarea = document.querySelector(CONSTANTS.SELECTORS.RICH_TEXTAREA);
        
        if (textareaWrapper && richTextarea) {
            // 高さの再計算をトリガー
            richTextarea.style.height = 'auto';
        }
    }

    /**
     * クリーンアップ処理
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
        if (this.snippetsContainer) {
            this.snippetsContainer.remove();
        }
    }
}

// スニペットマネージャーのインスタンスを作成
const snippetManager = new SnippetManager();