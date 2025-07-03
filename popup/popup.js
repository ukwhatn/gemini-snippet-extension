/**
 * Gemini Prompt Snippets - ポップアップスクリプト
 * スニペットの管理画面を提供（追加・削除・表示）
 */

// 定数定義
const CONSTANTS = {
    STORAGE_KEY: 'snippets',
    ELEMENTS: {
        SNIPPETS_LIST: 'snippets-list',
        ADD_BUTTON: 'add-snippet-btn',
        TEXT_INPUT: 'new-snippet-text',
        TITLE_INPUT: 'new-snippet-title'
    },
    CLASSES: {
        SNIPPET_ITEM: 'snippet-item',
        SNIPPET_TEXT: 'snippet-text',
        DELETE_BUTTON: 'delete-btn',
        EDIT_BUTTON: 'edit-btn',
        LOADING: 'loading'
    },
    MESSAGES: {
        NO_SNIPPETS: 'スニペットはまだありません。',
        UNTITLED: '無題',
        DELETE_CONFIRM: '削除してもよろしいですか？',
        UPDATE_BUTTON: 'スニペットを更新',
        CANCEL_BUTTON: 'キャンセル',
        ADD_BUTTON: 'スニペットを追加'
    }
};

/**
 * ポップアップ管理クラス
 */
class PopupManager {
    constructor() {
        this.elements = {};
        this.editingIndex = null; // 編集中のスニペットのインデックス
        this.init();
    }

    /**
     * 初期化処理
     */
    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.cacheElements();
            this.setupEventListeners();
            this.loadSnippets();
        });
    }

    /**
     * DOM要素をキャッシュ
     */
    cacheElements() {
        this.elements = {
            snippetsList: document.getElementById(CONSTANTS.ELEMENTS.SNIPPETS_LIST),
            addButton: document.getElementById(CONSTANTS.ELEMENTS.ADD_BUTTON),
            textInput: document.getElementById(CONSTANTS.ELEMENTS.TEXT_INPUT),
            titleInput: document.getElementById(CONSTANTS.ELEMENTS.TITLE_INPUT)
        };

        // 必須要素の存在確認
        Object.entries(this.elements).forEach(([key, element]) => {
            if (!element) {
                console.error(`必須要素が見つかりません: ${key}`);
            }
        });
    }

    /**
     * イベントリスナーの設定
     */
    setupEventListeners() {
        // 追加ボタンのクリックイベント
        this.elements.addButton?.addEventListener('click', () => this.handleAddOrUpdate());
        
        // Enterキーでの追加対応
        this.elements.textInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.handleAddOrUpdate();
            }
        });

        // ストレージの変更を監視
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'sync' && changes[CONSTANTS.STORAGE_KEY]) {
                this.renderSnippets(changes[CONSTANTS.STORAGE_KEY].newValue || []);
            }
        });
    }

    /**
     * スニペットを読み込んで表示
     */
    loadSnippets() {
        chrome.storage.sync.get({ [CONSTANTS.STORAGE_KEY]: [] }, (data) => {
            if (chrome.runtime.lastError) {
                console.error('ストレージ読み込みエラー:', chrome.runtime.lastError);
                this.showError('スニペットの読み込みに失敗しました');
                return;
            }
            
            this.renderSnippets(data[CONSTANTS.STORAGE_KEY]);
        });
    }

    /**
     * スニペット一覧を描画
     * @param {Array} snippets - スニペットの配列
     */
    renderSnippets(snippets) {
        if (!this.elements.snippetsList) return;

        this.elements.snippetsList.innerHTML = '';

        if (snippets.length === 0) {
            this.showEmptyMessage();
            return;
        }

        snippets.forEach((snippet, index) => {
            this.createSnippetItem(snippet, index);
        });
    }

    /**
     * 空の状態のメッセージを表示
     */
    showEmptyMessage() {
        const message = document.createElement('p');
        message.className = CONSTANTS.CLASSES.LOADING;
        message.textContent = CONSTANTS.MESSAGES.NO_SNIPPETS;
        this.elements.snippetsList.appendChild(message);
    }

    /**
     * スニペットアイテムを作成
     * @param {Object} snippet - スニペットオブジェクト
     * @param {number} index - インデックス
     */
    createSnippetItem(snippet, index) {
        const item = document.createElement('div');
        item.className = CONSTANTS.CLASSES.SNIPPET_ITEM;

        // スニペットテキスト
        const text = document.createElement('span');
        text.className = CONSTANTS.CLASSES.SNIPPET_TEXT;
        text.textContent = snippet.title || CONSTANTS.MESSAGES.UNTITLED;
        text.title = snippet.text; // ツールチップ

        // ボタンコンテナ
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';

        // 編集ボタン
        const editBtn = document.createElement('button');
        editBtn.className = CONSTANTS.CLASSES.EDIT_BUTTON;
        editBtn.textContent = '✏️';
        editBtn.title = '編集';
        editBtn.addEventListener('click', () => this.startEdit(snippet, index));

        // 削除ボタン
        const deleteBtn = document.createElement('button');
        deleteBtn.className = CONSTANTS.CLASSES.DELETE_BUTTON;
        deleteBtn.textContent = '×';
        deleteBtn.addEventListener('click', () => this.deleteSnippet(index));

        buttonContainer.appendChild(editBtn);
        buttonContainer.appendChild(deleteBtn);

        item.appendChild(text);
        item.appendChild(buttonContainer);
        this.elements.snippetsList.appendChild(item);
    }

    /**
     * 編集モードを開始
     * @param {Object} snippet - 編集するスニペット
     * @param {number} index - スニペットのインデックス
     */
    startEdit(snippet, index) {
        this.editingIndex = index;
        
        // フォームに既存の値を設定
        if (this.elements.titleInput) this.elements.titleInput.value = snippet.title || '';
        if (this.elements.textInput) this.elements.textInput.value = snippet.text || '';
        
        // ボタンのテキストを変更
        if (this.elements.addButton) {
            this.elements.addButton.textContent = CONSTANTS.MESSAGES.UPDATE_BUTTON;
        }
        
        // キャンセルボタンを追加（存在しない場合）
        this.addCancelButton();
        
        // タイトル入力フィールドにフォーカス
        this.elements.titleInput?.focus();
    }

    /**
     * キャンセルボタンを追加
     */
    addCancelButton() {
        // 既存のキャンセルボタンがある場合は何もしない
        if (document.getElementById('cancel-edit-btn')) return;
        
        const cancelBtn = document.createElement('button');
        cancelBtn.id = 'cancel-edit-btn';
        cancelBtn.className = 'button secondary';
        cancelBtn.textContent = CONSTANTS.MESSAGES.CANCEL_BUTTON;
        cancelBtn.addEventListener('click', () => this.cancelEdit());
        
        // 追加ボタンの後に挿入
        this.elements.addButton?.parentNode?.insertBefore(cancelBtn, this.elements.addButton.nextSibling);
    }

    /**
     * 編集をキャンセル
     */
    cancelEdit() {
        this.editingIndex = null;
        
        // フォームをクリア
        this.clearInputs();
        
        // ボタンのテキストを元に戻す
        if (this.elements.addButton) {
            this.elements.addButton.textContent = CONSTANTS.MESSAGES.ADD_BUTTON;
        }
        
        // キャンセルボタンを削除
        const cancelBtn = document.getElementById('cancel-edit-btn');
        cancelBtn?.remove();
    }

    /**
     * 追加または更新を処理
     */
    handleAddOrUpdate() {
        if (this.editingIndex !== null) {
            this.updateSnippet();
        } else {
            this.addSnippet();
        }
    }

    /**
     * スニペットを更新
     */
    updateSnippet() {
        const text = this.elements.textInput?.value.trim();
        const title = this.elements.titleInput?.value.trim();

        if (!text) {
            this.showTemporaryMessage('テキストを入力してください');
            return;
        }

        chrome.storage.sync.get({ [CONSTANTS.STORAGE_KEY]: [] }, (data) => {
            if (chrome.runtime.lastError) {
                console.error('ストレージ読み込みエラー:', chrome.runtime.lastError);
                this.showError('スニペットの更新に失敗しました');
                return;
            }

            const snippets = [...data[CONSTANTS.STORAGE_KEY]];
            
            // 指定されたインデックスのスニペットを更新
            if (this.editingIndex >= 0 && this.editingIndex < snippets.length) {
                snippets[this.editingIndex] = {
                    title: title || text.split('\n')[0] || CONSTANTS.MESSAGES.UNTITLED,
                    text: text
                };
            }

            chrome.storage.sync.set({ [CONSTANTS.STORAGE_KEY]: snippets }, () => {
                if (chrome.runtime.lastError) {
                    console.error('ストレージ保存エラー:', chrome.runtime.lastError);
                    this.showError('スニペットの更新に失敗しました');
                    return;
                }

                // 編集モードを終了
                this.cancelEdit();
                this.renderSnippets(snippets);
                this.showTemporaryMessage('スニペットを更新しました', 'success');
            });
        });
    }

    /**
     * 新しいスニペットを追加
     */
    addSnippet() {
        const text = this.elements.textInput?.value.trim();
        const title = this.elements.titleInput?.value.trim();

        if (!text) {
            this.showTemporaryMessage('テキストを入力してください');
            return;
        }

        chrome.storage.sync.get({ [CONSTANTS.STORAGE_KEY]: [] }, (data) => {
            if (chrome.runtime.lastError) {
                console.error('ストレージ読み込みエラー:', chrome.runtime.lastError);
                this.showError('スニペットの追加に失敗しました');
                return;
            }

            const snippets = data[CONSTANTS.STORAGE_KEY];
            const newSnippet = {
                title: title || text.split('\n')[0] || CONSTANTS.MESSAGES.UNTITLED,
                text: text
            };

            const updatedSnippets = [...snippets, newSnippet];

            chrome.storage.sync.set({ [CONSTANTS.STORAGE_KEY]: updatedSnippets }, () => {
                if (chrome.runtime.lastError) {
                    console.error('ストレージ保存エラー:', chrome.runtime.lastError);
                    this.showError('スニペットの保存に失敗しました');
                    return;
                }

                // 入力フィールドをクリア
                this.clearInputs();
                this.renderSnippets(updatedSnippets);
            });
        });
    }

    /**
     * スニペットを削除
     * @param {number} index - 削除するスニペットのインデックス
     */
    deleteSnippet(index) {
        chrome.storage.sync.get({ [CONSTANTS.STORAGE_KEY]: [] }, (data) => {
            if (chrome.runtime.lastError) {
                console.error('ストレージ読み込みエラー:', chrome.runtime.lastError);
                this.showError('スニペットの削除に失敗しました');
                return;
            }

            const snippets = data[CONSTANTS.STORAGE_KEY];
            const updatedSnippets = snippets.filter((_, i) => i !== index);

            chrome.storage.sync.set({ [CONSTANTS.STORAGE_KEY]: updatedSnippets }, () => {
                if (chrome.runtime.lastError) {
                    console.error('ストレージ保存エラー:', chrome.runtime.lastError);
                    this.showError('スニペットの削除に失敗しました');
                    return;
                }

                this.renderSnippets(updatedSnippets);
            });
        });
    }

    /**
     * 入力フィールドをクリア
     */
    clearInputs() {
        if (this.elements.textInput) this.elements.textInput.value = '';
        if (this.elements.titleInput) this.elements.titleInput.value = '';
        this.elements.titleInput?.focus();
    }

    /**
     * エラーメッセージを表示
     * @param {string} message - エラーメッセージ
     */
    showError(message) {
        console.error(message);
        this.showTemporaryMessage(message, 'error');
    }

    /**
     * 一時的なメッセージを表示
     * @param {string} message - メッセージ
     * @param {string} type - メッセージタイプ
     */
    showTemporaryMessage(message, type = 'info') {
        const messageEl = document.createElement('div');
        messageEl.textContent = message;
        
        let backgroundColor;
        switch(type) {
            case 'error':
                backgroundColor = '#f44336';
                break;
            case 'success':
                backgroundColor = '#4CAF50';
                break;
            default:
                backgroundColor = '#2196F3';
        }
        
        messageEl.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 10px;
            background-color: ${backgroundColor};
            color: white;
            border-radius: 4px;
            z-index: 1000;
        `;
        
        document.body.appendChild(messageEl);
        
        setTimeout(() => {
            messageEl.remove();
        }, 3000);
    }
}

// ポップアップマネージャーのインスタンスを作成
const popupManager = new PopupManager();