/**
 * Gemini Prompt Snippets - Popup Script
 */

const POPUP_CONFIG = {
    STORAGE_KEY: 'snippets',
    MESSAGES: {
        NO_SNIPPETS: 'スニペットはまだありません',
        UNTITLED: '無題',
        UPDATE_BUTTON: '更新',
        ADD_BUTTON: '追加'
    }
};

class PopupManager {
    constructor() {
        this.elements = {};
        this.editingIndex = null;
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.cacheElements();
            this.setupEventListeners();
            this.loadSnippets();
        });
    }

    cacheElements() {
        this.elements = {
            snippetsList: document.getElementById('snippets-list'),
            addButton: document.getElementById('add-snippet-btn'),
            textInput: document.getElementById('new-snippet-text'),
            titleInput: document.getElementById('new-snippet-title')
        };
    }

    setupEventListeners() {
        this.elements.addButton?.addEventListener('click', () => this.handleAddOrUpdate());
        this.elements.textInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) this.handleAddOrUpdate();
        });

        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'sync' && changes[POPUP_CONFIG.STORAGE_KEY]) {
                this.renderSnippets(changes[POPUP_CONFIG.STORAGE_KEY].newValue || []);
            }
        });
    }

    loadSnippets() {
        chrome.storage.sync.get({ [POPUP_CONFIG.STORAGE_KEY]: [] }, (data) => {
            if (chrome.runtime.lastError) {
                this.showToast('スニペットの読み込みに失敗しました', 'error');
                return;
            }
            this.renderSnippets(data[POPUP_CONFIG.STORAGE_KEY]);
        });
    }

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

    showEmptyMessage() {
        const message = document.createElement('p');
        message.className = 'loading';
        message.textContent = POPUP_CONFIG.MESSAGES.NO_SNIPPETS;
        this.elements.snippetsList.appendChild(message);
    }

    createSnippetItem(snippet, index) {
        const item = document.createElement('div');
        item.className = 'snippet-item';

        const text = document.createElement('span');
        text.className = 'snippet-text';
        text.textContent = snippet.title || POPUP_CONFIG.MESSAGES.UNTITLED;
        text.title = snippet.text;

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';

        const editBtn = this.createActionButton('edit-btn', 'fas fa-edit', '編集', () => {
            this.startEdit(snippet, index);
        });

        const deleteBtn = this.createActionButton('delete-btn', 'fas fa-trash', '削除', () => {
            this.deleteSnippet(index);
        });

        buttonContainer.appendChild(editBtn);
        buttonContainer.appendChild(deleteBtn);
        item.appendChild(text);
        item.appendChild(buttonContainer);
        this.elements.snippetsList.appendChild(item);
    }

    createActionButton(className, iconClass, title, clickHandler) {
        const button = document.createElement('button');
        button.className = className;
        button.innerHTML = `<i class="${iconClass}"></i>`;
        button.title = title;
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            clickHandler();
        });
        return button;
    }

    startEdit(snippet, index) {
        this.editingIndex = index;
        this.elements.titleInput.value = snippet.title || '';
        this.elements.textInput.value = snippet.text || '';
        this.elements.addButton.innerHTML = `<i class="fas fa-save"></i><span>${POPUP_CONFIG.MESSAGES.UPDATE_BUTTON}</span>`;
        this.addCancelButton();
        this.elements.titleInput.focus();
    }

    addCancelButton() {
        if (document.getElementById('cancel-edit-btn')) return;
        
        const cancelBtn = document.createElement('button');
        cancelBtn.id = 'cancel-edit-btn';
        cancelBtn.className = 'button text';
        cancelBtn.innerHTML = 'キャンセル';
        cancelBtn.addEventListener('click', () => this.cancelEdit());
        
        const actionButtons = document.getElementById('action-buttons');
        actionButtons?.insertBefore(cancelBtn, this.elements.addButton);
    }

    cancelEdit() {
        this.editingIndex = null;
        this.clearInputs();
        this.elements.addButton.innerHTML = `<i class="fas fa-plus"></i><span>${POPUP_CONFIG.MESSAGES.ADD_BUTTON}</span>`;
        document.getElementById('cancel-edit-btn')?.remove();
    }

    handleAddOrUpdate() {
        if (this.editingIndex !== null) {
            this.updateSnippet();
        } else {
            this.addSnippet();
        }
    }

    updateSnippet() {
        const text = this.elements.textInput?.value.trim();
        const title = this.elements.titleInput?.value.trim();

        if (!text) {
            this.showToast('テキストを入力してください', 'error');
            return;
        }

        this.performStorageOperation((snippets) => {
            if (this.editingIndex >= 0 && this.editingIndex < snippets.length) {
                snippets[this.editingIndex] = {
                    title: title || text.split('\n')[0] || POPUP_CONFIG.MESSAGES.UNTITLED,
                    text: text
                };
            }
            return snippets;
        }, () => {
            this.cancelEdit();
            this.showToast('スニペットを更新しました', 'success');
        });
    }

    addSnippet() {
        const text = this.elements.textInput?.value.trim();
        const title = this.elements.titleInput?.value.trim();

        if (!text) {
            this.showToast('テキストを入力してください', 'error');
            return;
        }

        this.performStorageOperation((snippets) => {
            const newSnippet = {
                title: title || text.split('\n')[0] || POPUP_CONFIG.MESSAGES.UNTITLED,
                text: text
            };
            return [...snippets, newSnippet];
        }, () => {
            this.clearInputs();
            this.showToast('スニペットを追加しました', 'success');
        });
    }

    deleteSnippet(index) {
        this.showDeleteConfirmDialog((confirmed) => {
            if (!confirmed) return;

            this.performStorageOperation((snippets) => {
                return snippets.filter((_, i) => i !== index);
            }, () => {
                this.showToast('スニペットを削除しました', 'success');
            });
        });
    }

    performStorageOperation(operation, onSuccess) {
        chrome.storage.sync.get({ [POPUP_CONFIG.STORAGE_KEY]: [] }, (data) => {
            if (chrome.runtime.lastError) {
                this.showToast('操作に失敗しました', 'error');
                return;
            }

            const updatedSnippets = operation(data[POPUP_CONFIG.STORAGE_KEY]);

            chrome.storage.sync.set({ [POPUP_CONFIG.STORAGE_KEY]: updatedSnippets }, () => {
                if (chrome.runtime.lastError) {
                    this.showToast('保存に失敗しました', 'error');
                    return;
                }

                this.renderSnippets(updatedSnippets);
                onSuccess();
            });
        });
    }

    showDeleteConfirmDialog(callback) {
        const dialog = document.getElementById('delete-dialog');
        const confirmBtn = document.getElementById('dialog-confirm');
        const cancelBtn = document.getElementById('dialog-cancel');

        dialog.style.display = 'flex';

        const handleConfirm = () => {
            dialog.style.display = 'none';
            removeListeners();
            callback(true);
        };

        const handleCancel = () => {
            dialog.style.display = 'none';
            removeListeners();
            callback(false);
        };

        const removeListeners = () => {
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            dialog.removeEventListener('click', handleOverlayClick);
        };

        const handleOverlayClick = (e) => {
            if (e.target === dialog) handleCancel();
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        dialog.addEventListener('click', handleOverlayClick);
    }

    clearInputs() {
        this.elements.textInput.value = '';
        this.elements.titleInput.value = '';
        this.elements.titleInput.focus();
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = 'toast';
        
        const icons = {
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-exclamation-circle"></i>',
            info: '<i class="fas fa-info-circle"></i>'
        };
        
        toast.innerHTML = `${icons[type] || icons.info} ${message}`;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutDown 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// スタイル追加
const style = document.createElement('style');
style.textContent = `
    .toast i { margin-right: 8px; }
    @keyframes slideOutDown {
        to { opacity: 0; transform: translate(-50%, 100%); }
    }
`;
document.head.appendChild(style);

new PopupManager();