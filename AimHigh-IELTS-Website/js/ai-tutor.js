// ===== JS/AI-TUTOR.JS - LOGIC XỬ LÝ KHUNG CHAT AI =====

(function () {
    const chatContainer = document.getElementById('chatContainer');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const clearChatBtn = document.getElementById('clearChatBtn');
    const welcomeBoard = document.getElementById('welcomeBoard');

    const STORAGE_KEY = 'aimhigh_chat_history_v1';
    let chatHistory = [];
    let isSending = false;

    window.addEventListener('DOMContentLoaded', async () => {
        const token = localStorage.getItem('aimhigh_token');
        if (!token) {
            alert('Vui lòng đăng nhập để trò chuyện với AI Tutor!');
            window.location.href = 'login.html';
            return;
        }

        initControls();
        await loadHistory();
    });

    async function loadHistory() {
        if (typeof apiFetch === 'function') {
            try {
                const res = await apiFetch('/ai/chat/history');
                const serverHistory = Array.isArray(res?.data) ? res.data : [];
                chatHistory = serverHistory.map(normalizeMessage).filter(Boolean);
                saveLocalHistory();
                renderHistory();
                return;
            } catch (error) {
                console.warn('Không thể tải lịch sử AI Tutor từ backend:', error?.message || error);
            }
        }

        loadLocalHistory();
        renderHistory();
    }

    function loadLocalHistory() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            chatHistory = raw ? JSON.parse(raw) : [];
        } catch (_) {
            chatHistory = [];
        }
    }

    function saveLocalHistory() {
        if (chatHistory.length > 30) {
            chatHistory = chatHistory.slice(chatHistory.length - 30);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory));
    }

    function renderHistory() {
        const messages = [...chatHistory];
        chatContainer.innerHTML = '';

        if (messages.length === 0) {
            if (welcomeBoard) {
                chatContainer.appendChild(welcomeBoard);
                welcomeBoard.style.display = 'block';
            }
            return;
        }

        if (welcomeBoard) welcomeBoard.style.display = 'none';
        messages.forEach(msg => appendMessageUI(msg.role, msg.text));
        scrollToBottom();
    }

    function initControls() {
        chatInput.addEventListener('input', updateSendButtonState);

        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey && !sendBtn.disabled) {
                e.preventDefault();
                sendMessage();
            }
        });

        sendBtn.addEventListener('click', () => sendMessage());

        if (clearChatBtn) {
            clearChatBtn.addEventListener('click', clearHistory);
        }
    }

    async function clearHistory() {
        if (!confirm('Bạn có muốn xóa toàn bộ lịch sử trò chuyện với AI không?')) {
            return;
        }

        try {
            if (typeof apiFetch === 'function') {
                await apiFetch('/ai/chat/history', { method: 'DELETE' });
            }
        } catch (error) {
            console.warn('Không thể xóa lịch sử AI Tutor trên backend:', error?.message || error);
        }

        chatHistory = [];
        localStorage.removeItem(STORAGE_KEY);
        renderHistory();

        if (typeof showToast === 'function') {
            showToast('Đã xóa lịch sử trò chuyện', 'success');
        }
    }

    async function sendMessage(overrideText = '') {
        const text = String(overrideText || chatInput.value || '').trim();
        if (!text || isSending) return;

        if (!overrideText) {
            chatInput.value = '';
        }
        setSendingState(true);

        if (welcomeBoard && welcomeBoard.style.display !== 'none') {
            welcomeBoard.style.display = 'none';
        }

        appendAndStoreMessage('user', text);
        scrollToBottom();

        const typingIndicator = showTypingIndicator();
        scrollToBottom();

        try {
            if (typeof apiFetch !== 'function') {
                throw new Error('Hệ thống API chưa sẵn sàng. Vui lòng thử lại sau.');
            }

            const res = await apiFetch('/ai/chat', {
                method: 'POST',
                body: JSON.stringify({ message: text })
            });

            removeTypingIndicator(typingIndicator);

            const data = res?.data || {};
            const aiText = data.response || 'AI Tutor chưa có phản hồi.';
            const assistantMessage = normalizeMessage(data.assistantMessage) || { role: 'model', text: aiText };

            chatHistory = chatHistory.filter(msg => msg !== null);
            chatHistory.push(assistantMessage);
            saveLocalHistory();
            appendMessageUI(assistantMessage.role, assistantMessage.text);
            scrollToBottom();
        } catch (error) {
            removeTypingIndicator(typingIndicator);
            appendAndStoreMessage('model', `Lỗi: ${error.message || 'Không thể kết nối máy chủ.'}`);
            scrollToBottom();
        } finally {
            setSendingState(false);
        }
    }

    function appendAndStoreMessage(role, text) {
        const message = { role, text };
        chatHistory.push(message);
        saveLocalHistory();
        appendMessageUI(role, text);
    }

    function appendMessageUI(role, text) {
        const row = document.createElement('div');
        row.className = `message-row ${role === 'user' ? 'user' : 'bot'}`;

        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.innerHTML = `<p>${escapeHtml(String(text || '')).replace(/\n/g, '<br>')}</p>`;

        row.appendChild(bubble);
        chatContainer.appendChild(row);
    }

    function showTypingIndicator() {
        const row = document.createElement('div');
        row.className = 'message-row bot';
        row.id = 'aiTypingIndicator';

        const bubble = document.createElement('div');
        bubble.className = 'typing-bubble';
        bubble.innerHTML = `
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
        `;

        row.appendChild(bubble);
        chatContainer.appendChild(row);
        return row;
    }

    function removeTypingIndicator(el) {
        if (el && el.parentNode) {
            el.parentNode.removeChild(el);
            return;
        }

        const fallback = document.getElementById('aiTypingIndicator');
        if (fallback) fallback.parentNode.removeChild(fallback);
    }

    function setSendingState(value) {
        isSending = value;
        chatInput.disabled = value;
        updateSendButtonState();
    }

    function updateSendButtonState() {
        sendBtn.disabled = isSending || chatInput.value.trim() === '';
    }

    function normalizeMessage(message) {
        if (!message) return null;
        const role = message.role === 'assistant' ? 'model' : message.role;
        const text = message.text || message.content || message.response || '';
        if (!text) return null;
        return {
            id: message.id,
            role: role === 'user' ? 'user' : 'model',
            text,
            createdAt: message.createdAt
        };
    }

    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function escapeHtml(unsafe) {
        return String(unsafe)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    window.sendSuggestion = function (text) {
        sendMessage(text);
    };
})();
