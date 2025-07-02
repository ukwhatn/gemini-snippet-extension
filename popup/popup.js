document.addEventListener('DOMContentLoaded', () => {
  const snippetsList = document.getElementById('snippets-list');
  const addSnippetBtn = document.getElementById('add-snippet-btn');
  const newSnippetText = document.getElementById('new-snippet-text');
  const newSnippetTitle = document.getElementById('new-snippet-title');

  // データ移行関数：旧形式のスニペット（文字列）を新形式（オブジェクト）に変換
  function migrateSnippets(snippets) {
    return snippets.map(snippet => {
      if (typeof snippet === 'string') {
        // 旧形式の場合、最初の行をタイトルとして使用
        const lines = snippet.split('\n');
        return {
          title: lines[0] || 'Untitled',
          text: snippet
        };
      }
      return snippet;
    });
  }

  function renderSnippets(snippets) {
    snippetsList.innerHTML = '';
    if (snippets.length === 0) {
        // スニペットがない場合のメッセージを更新
        snippetsList.innerHTML = '<p class="loading">スニペットはまだありません。</p>';
        return;
    }
    snippets.forEach((snippet, index) => {
      const snippetItem = document.createElement('div');
      snippetItem.className = 'snippet-item';

      const snippetText = document.createElement('span');
      snippetText.className = 'snippet-text';
      snippetText.textContent = snippet.title || snippet.text.split('\n')[0]; // タイトルを表示
      snippetText.title = snippet.text;

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = '×';
      deleteBtn.addEventListener('click', () => {
        deleteSnippet(index);
      });

      snippetItem.appendChild(snippetText);
      snippetItem.appendChild(deleteBtn);
      snippetsList.appendChild(snippetItem);
    });
  }

  function getSnippets() {
    // 初期スニペットを追加するロジックを削除し、ストレージから直接読み込むだけにしました。
    chrome.storage.sync.get({ snippets: [] }, (data) => {
        const migratedSnippets = migrateSnippets(data.snippets);
        // 移行が必要な場合は保存
        if (data.snippets.some(s => typeof s === 'string')) {
          chrome.storage.sync.set({ snippets: migratedSnippets });
        }
        renderSnippets(migratedSnippets);
    });
  }

  function addSnippet() {
    const text = newSnippetText.value.trim();
    const title = newSnippetTitle.value.trim();
    if (text) {
      chrome.storage.sync.get({ snippets: [] }, (data) => {
        const migratedSnippets = migrateSnippets(data.snippets);
        const newSnippet = {
          title: title || text.split('\n')[0] || 'Untitled',
          text: text
        };
        const newSnippets = [...migratedSnippets, newSnippet];
        chrome.storage.sync.set({ snippets: newSnippets }, () => {
          renderSnippets(newSnippets);
          newSnippetText.value = '';
          newSnippetTitle.value = '';
        });
      });
    }
  }

  function deleteSnippet(index) {
    chrome.storage.sync.get({ snippets: [] }, (data) => {
      const migratedSnippets = migrateSnippets(data.snippets);
      const newSnippets = migratedSnippets.filter((_, i) => i !== index);
      chrome.storage.sync.set({ snippets: newSnippets }, () => {
        renderSnippets(newSnippets);
      });
    });
  }

  addSnippetBtn.addEventListener('click', addSnippet);
  
  // Listen for storage changes from other parts of the extension
  chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'sync' && changes.snippets) {
          const migratedSnippets = migrateSnippets(changes.snippets.newValue);
          renderSnippets(migratedSnippets);
      }
  });

  // Initial load
  getSnippets();
});