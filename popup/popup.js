/**
 * Gemini Prompt Snippets - Material Design Version
 * Font Awesomeアイコンとマテリアルデザインインタラクション
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
        LOADING: 'loading-container'
    },
    MESSAGES: {
        NO_SNIPPETS: 'スニペットはまだありません',
        UNTITLED: '無題',
        DELETE_CONFIRM: '削除してもよろしいですか？',
        UPDATE_BUTTON: '更新',
        CANCEL_BUTTON: 'キャンセル',
        ADD_BUTTON: '追加'
    }
};

/**
 * ポップアップ管理クラス
 */
class PopupManager {
    constructor() {
        this.elements = {};
        this.editingIndex = null;
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
            this.setupRippleEffect();
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
     * リップルエフェクトの設定
     */
    setupRippleEffect() {
        document.addEventListener('click', (e) => {
            const button = e.target.closest('.button, .snippet-item');
            if (button && !button.classList.contains('text')) {
                this.createRipple(e, button);
            }
        });
    }

    /**
     * リップルエフェクトを作成
     */
    createRipple(event, element) {
        const ripple = document.createElement('span');
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.className = 'ripple';
        
        // 既存のリップルを削除
        const existingRipple = element.querySelector('.ripple');
        if (existingRipple) {
            existingRipple.remove();
        }

        element.appendChild(ripple);

        // アニメーション後に削除
        setTimeout(() => {
            ripple.remove();
        }, 600);
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
                this.showToast('スニペットの読み込みに失敗しました', 'error');
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
        message.className = 'loading';
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
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.title = '編集';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.startEdit(snippet, index);
        });

        // 削除ボタン
        const deleteBtn = document.createElement('button');
        deleteBtn.className = CONSTANTS.CLASSES.DELETE_BUTTON;
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = '削除';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteSnippet(index);
        });

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
            this.elements.addButton.innerHTML = '<i class="fas fa-save"></i><span>' + CONSTANTS.MESSAGES.UPDATE_BUTTON + '</span>';
        }
        
        // キャンセルボタンを追加
        this.addCancelButton();
        
        // タイトル入力フィールドにフォーカス
        this.elements.titleInput?.focus();
        
        // フローティングラベルの状態を更新
        this.updateFloatingLabels();
    }

    /**
     * フローティングラベルの状態を更新
     */
    updateFloatingLabels() {
        const inputs = document.querySelectorAll('.text-input');
        inputs.forEach(input => {
            if (input.value) {
                input.classList.add('has-value');
            } else {
                input.classList.remove('has-value');
            }
        });
    }

    /**
     * キャンセルボタンを追加
     */
    addCancelButton() {
        // 既存のキャンセルボタンがある場合は何もしない
        if (document.getElementById('cancel-edit-btn')) return;
        
        const cancelBtn = document.createElement('button');
        cancelBtn.id = 'cancel-edit-btn';
        cancelBtn.className = 'button text';
        cancelBtn.innerHTML = CONSTANTS.MESSAGES.CANCEL_BUTTON;
        cancelBtn.addEventListener('click', () => this.cancelEdit());
        
        // アクションボタンコンテナ内の追加ボタンの前に挿入
        const actionButtons = document.getElementById('action-buttons');
        actionButtons?.insertBefore(cancelBtn, this.elements.addButton);
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
            this.elements.addButton.innerHTML = '<i class="fas fa-plus"></i><span>' + CONSTANTS.MESSAGES.ADD_BUTTON + '</span>';
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
            this.showToast('テキストを入力してください', 'error');
            return;
        }

        chrome.storage.sync.get({ [CONSTANTS.STORAGE_KEY]: [] }, (data) => {
            if (chrome.runtime.lastError) {
                console.error('ストレージ読み込みエラー:', chrome.runtime.lastError);
                this.showToast('スニペットの更新に失敗しました', 'error');
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
                    this.showToast('スニペットの更新に失敗しました', 'error');
                    return;
                }

                // 編集モードを終了
                this.cancelEdit();
                this.renderSnippets(snippets);
                this.showToast('スニペットを更新しました', 'success');
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
            this.showToast('テキストを入力してください', 'error');
            return;
        }

        chrome.storage.sync.get({ [CONSTANTS.STORAGE_KEY]: [] }, (data) => {
            if (chrome.runtime.lastError) {
                console.error('ストレージ読み込みエラー:', chrome.runtime.lastError);
                this.showToast('スニペットの追加に失敗しました', 'error');
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
                    this.showToast('スニペットの保存に失敗しました', 'error');
                    return;
                }

                // 入力フィールドをクリア
                this.clearInputs();
                this.renderSnippets(updatedSnippets);
                this.showToast('スニペットを追加しました', 'success');
            });
        });
    }

    /**
     * スニペットを削除
     * @param {number} index - 削除するスニペットのインデックス
     */
    deleteSnippet(index) {
        // カスタム削除確認ダイアログを表示
        this.showDeleteConfirmDialog((confirmed) => {
            if (!confirmed) {
                return;
            }

            chrome.storage.sync.get({ [CONSTANTS.STORAGE_KEY]: [] }, (data) => {
                if (chrome.runtime.lastError) {
                    console.error('ストレージ読み込みエラー:', chrome.runtime.lastError);
                    this.showToast('スニペットの削除に失敗しました', 'error');
                    return;
                }

                const snippets = data[CONSTANTS.STORAGE_KEY];
                const updatedSnippets = snippets.filter((_, i) => i !== index);

                chrome.storage.sync.set({ [CONSTANTS.STORAGE_KEY]: updatedSnippets }, () => {
                    if (chrome.runtime.lastError) {
                        console.error('ストレージ保存エラー:', chrome.runtime.lastError);
                        this.showToast('スニペットの削除に失敗しました', 'error');
                        return;
                    }

                    this.renderSnippets(updatedSnippets);
                    this.showToast('スニペットを削除しました', 'success');
                });
            });
        });
    }

    /**
     * 削除確認ダイアログを表示
     * @param {Function} callback - 確認結果を受け取るコールバック関数
     */
    showDeleteConfirmDialog(callback) {
        const dialog = document.getElementById('delete-dialog');
        const confirmBtn = document.getElementById('dialog-confirm');
        const cancelBtn = document.getElementById('dialog-cancel');

        // ダイアログを表示
        dialog.style.display = 'flex';

        // 確認ボタンのイベントハンドラ
        const handleConfirm = () => {
            dialog.style.display = 'none';
            removeEventListeners();
            callback(true);
        };

        // キャンセルボタンのイベントハンドラ
        const handleCancel = () => {
            dialog.style.display = 'none';
            removeEventListeners();
            callback(false);
        };

        // イベントリスナーを削除する関数
        const removeEventListeners = () => {
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            dialog.removeEventListener('click', handleOverlayClick);
        };

        // オーバーレイクリックでキャンセル
        const handleOverlayClick = (e) => {
            if (e.target === dialog) {
                handleCancel();
            }
        };

        // イベントリスナーを追加
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        dialog.addEventListener('click', handleOverlayClick);
    }

    /**
     * 入力フィールドをクリア
     */
    clearInputs() {
        if (this.elements.textInput) this.elements.textInput.value = '';
        if (this.elements.titleInput) this.elements.titleInput.value = '';
        this.updateFloatingLabels();
        this.elements.titleInput?.focus();
    }

    /**
     * マテリアルデザインのトーストメッセージを表示
     * @param {string} message - メッセージ
     * @param {string} type - メッセージタイプ (success, error, info)
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        
        // タイプに応じてアイコンを追加
        let icon = '';
        switch(type) {
            case 'success':
                icon = '<i class="fas fa-check-circle" style="margin-right: 8px;"></i>';
                break;
            case 'error':
                icon = '<i class="fas fa-exclamation-circle" style="margin-right: 8px;"></i>';
                break;
            default:
                icon = '<i class="fas fa-info-circle" style="margin-right: 8px;"></i>';
        }
        
        toast.innerHTML = icon + message;
        document.body.appendChild(toast);
        
        // アニメーション後に削除
        setTimeout(() => {
            toast.style.animation = 'slideOutDown 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
}

// リップルエフェクト用のスタイルを追加
const style = document.createElement('style');
style.textContent = `
    .ripple {
        position: absolute;
        border-radius: 50%;
        background-color: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
    }
    
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    @keyframes slideOutDown {
        from {
            opacity: 1;
            transform: translate(-50%, 0);
        }
        to {
            opacity: 0;
            transform: translate(-50%, 100%);
        }
    }
`;
document.head.appendChild(style);

// ポップアップマネージャーのインスタンスを作成
const popupManager = new PopupManager();