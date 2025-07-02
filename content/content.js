let snippetsContainer = null;

// Function to create and inject snippet buttons
const createSnippetButtons = () => {
    // Check if buttons are already injected
    if (document.getElementById('gemini-snippet-container')) {
        return;
    }

    const targetArea = document.querySelector('input-container');
    if (!targetArea) {
        return;
    }
    
    // Create container for buttons
    snippetsContainer = document.createElement('div');
    snippetsContainer.id = 'gemini-snippet-container';

    // Load snippets from storage and create a button for each
    loadSnippetsAndCreateButtons();
    
    // Insert the container at the end of .input-area-container
    const inputAreaContainer = targetArea.querySelector('.input-area-container');
    if (inputAreaContainer) {
        inputAreaContainer.appendChild(snippetsContainer);
    } else {
        console.error('input-area-container not found');
    }
};

const loadSnippetsAndCreateButtons = () => {
    if (!snippetsContainer) return;

    chrome.storage.sync.get({ snippets: [] }, (data) => {
        snippetsContainer.innerHTML = ''; // Clear existing buttons
        
        // データ移行処理
        const snippets = data.snippets.map(snippet => {
            if (typeof snippet === 'string') {
                return {
                    title: snippet.split('\n')[0] || 'Untitled',
                    text: snippet
                };
            }
            return snippet;
        });
        
        snippets.forEach((snippet) => {
            const button = document.createElement('button');
            button.className = 'snippet-button';
            button.textContent = snippet.title; // タイトルを表示
            button.title = snippet.text; // フルテキストをツールチップに表示

            button.addEventListener('click', () => {
                insertTextIntoGemini(snippet.text);
            });

            snippetsContainer.appendChild(button);
        });
    });
};

const insertTextIntoGemini = (text) => {
    const editor = document.querySelector('div.ql-editor');
    if (!editor) {
        console.error('Gemini editor not found.');
        return;
    }
    
    // Clear existing content
    editor.innerHTML = '';
    
    // Insert new content line by line
    const lines = text.split('\n');
    lines.forEach(line => {
        const p = document.createElement('p');
        // Gemini uses <br> for empty lines within a <p>
        if (line.trim() === '') {
            p.innerHTML = '<br>';
        } else {
            p.textContent = line;
        }
        editor.appendChild(p);
    });
    
    // Focus the editor and trigger an input event to notify the page of the change
    editor.focus();
    editor.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));

    // Set cursor position to the end of the text
    const range = document.createRange();
    const selection = window.getSelection();
    
    // Select the last child of the editor
    if (editor.lastChild) {
        // If the last child is a text node, position at the end of it
        if (editor.lastChild.nodeType === Node.TEXT_NODE) {
            range.setStart(editor.lastChild, editor.lastChild.textContent.length);
            range.setEnd(editor.lastChild, editor.lastChild.textContent.length);
        } else {
            // If it's an element (like <p>), position after its last child or at the end
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
        // If editor is empty, just position at the start
        range.selectNodeContents(editor);
        range.collapse(false);
    }
    
    // Apply the selection
    selection.removeAllRanges();
    selection.addRange(range);

    // Adjust textarea height if necessary
    const textareaWrapper = document.querySelector('.text-input-field_textarea-wrapper');
    const richTextarea = document.querySelector('rich-textarea');
    if (textareaWrapper && richTextarea) {
        // This is a proxy for recalculating height. A more robust solution might
        // require observing the component's internal state, but this works in many cases.
        richTextarea.style.height = 'auto'; 
    }
};


// Use MutationObserver to wait for the input area to be added to the DOM
const observer = new MutationObserver((mutations, obs) => {
    // The target input area component is <input-area-v2>
    const inputArea = document.querySelector('input-area-v2');
    if (inputArea) {
        createSnippetButtons();
        // Once we've found and set up the buttons, we might not need to observe anymore.
        // However, on single-page apps, elements can be removed and re-added.
        // So we keep observing, but our createSnippetButtons function has a check
        // to prevent re-injection.
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
});

// Listen for storage changes to dynamically update buttons
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.snippets) {
        // If the container exists, reload buttons
        if (snippetsContainer) {
            loadSnippetsAndCreateButtons();
        }
    }
});