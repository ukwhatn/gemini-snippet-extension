/**
 * Gemini Prompt Snippets - Content Script
 */

const SNIPPET_CONFIG = {
    CONTAINER_ID: 'gemini-snippet-container',
    STORAGE_KEY: 'snippets',
    SELECTORS: {
        INPUT_CONTAINER: 'input-container',
        INPUT_AREA_CONTAINER: '.input-area-container',
        INPUT_AREA_V2: 'input-area-v2',
        EDITOR: 'div.ql-editor',
        TEXTAREA_WRAPPER: '.text-input-field_textarea-wrapper',
        RICH_TEXTAREA: 'rich-textarea'
    }
};

class SnippetManager {
    constructor() {
        this.container = null;
        this.observer = null;
        this.init();
    }

    init() {
        this.setupObserver();
        this.setupStorageListener();
    }

    setupObserver() {
        this.observer = new MutationObserver(() => {
            const inputArea = document.querySelector(SNIPPET_CONFIG.SELECTORS.INPUT_AREA_V2);
            if (inputArea) this.createButtons();
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    setupStorageListener() {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'sync' && changes[SNIPPET_CONFIG.STORAGE_KEY] && this.container) {
                this.loadAndCreateButtons();
            }
        });
    }

    createButtons() {
        if (document.getElementById(SNIPPET_CONFIG.CONTAINER_ID)) return;

        const targetArea = document.querySelector(SNIPPET_CONFIG.SELECTORS.INPUT_CONTAINER);
        if (!targetArea) return;

        this.container = document.createElement('div');
        this.container.id = SNIPPET_CONFIG.CONTAINER_ID;

        const inputAreaContainer = targetArea.querySelector(SNIPPET_CONFIG.SELECTORS.INPUT_AREA_CONTAINER);
        if (inputAreaContainer) {
            inputAreaContainer.appendChild(this.container);
            this.loadAndCreateButtons();
        }
    }

    loadAndCreateButtons() {
        if (!this.container) return;

        chrome.storage.sync.get({ [SNIPPET_CONFIG.STORAGE_KEY]: [] }, (data) => {
            this.container.innerHTML = '';
            data[SNIPPET_CONFIG.STORAGE_KEY].forEach(snippet => {
                this.createButton(snippet);
            });
        });
    }

    createButton(snippet) {
        const button = document.createElement('button');
        button.className = 'snippet-button';
        button.textContent = snippet.title;
        button.title = snippet.text;
        button.addEventListener('click', () => this.insertText(snippet.text));
        this.container.appendChild(button);
    }

    insertText(text) {
        const editor = document.querySelector(SNIPPET_CONFIG.SELECTORS.EDITOR);
        if (!editor) return;

        editor.innerHTML = '';
        text.split('\n').forEach(line => {
            const p = document.createElement('p');
            p.innerHTML = line.trim() === '' ? '<br>' : '';
            if (line.trim() !== '') p.textContent = line;
            editor.appendChild(p);
        });
        editor.innerHTML += '<br><br>';

        this.focusEditor(editor);
        this.setCursorToEnd(editor);
        this.adjustHeight();
        this.scrollToBottom(editor);
    }

    focusEditor(editor) {
        editor.focus();
        editor.dispatchEvent(new Event('input', { bubbles: true }));
    }

    setCursorToEnd(editor) {
        const range = document.createRange();
        const selection = window.getSelection();
        
        if (editor.lastChild) {
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
        } else {
            range.selectNodeContents(editor);
            range.collapse(false);
        }

        selection.removeAllRanges();
        selection.addRange(range);
    }

    adjustHeight() {
        const richTextarea = document.querySelector(SNIPPET_CONFIG.SELECTORS.RICH_TEXTAREA);
        if (richTextarea) {
            richTextarea.style.height = 'auto';
        }
    }

    scrollToBottom(editor) {
        editor.scrollTop = editor.scrollHeight;
        const scrollableParent = editor.closest('.ql-container') || editor.parentElement;
        if (scrollableParent) {
            scrollableParent.scrollTop = scrollableParent.scrollHeight;
        }
        
        const lastChild = editor.lastElementChild;
        if (lastChild) {
            lastChild.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }

    destroy() {
        if (this.observer) this.observer.disconnect();
        if (this.container) this.container.remove();
    }
}

new SnippetManager();