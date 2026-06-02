// ===== JS/AI-TUTOR.JS - LOGIC XỬ LÝ KHUNG CHAT AI =====

(function () {
    const chatContainer = document.getElementById('chatContainer');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const clearChatBtn = document.getElementById('clearChatBtn');
    const welcomeBoard = document.getElementById('welcomeBoard');

    const STORAGE_KEY = 'aimhigh_chat_history_v1';
    let chatHistory = []; // Lưu trữ dạng: { role: 'user'|'model', text: '...' }

    // Init Page
    window.addEventListener('DOMContentLoaded', () => {
        // Kiểm tra xem đã đăng nhập chưa
        const token = localStorage.getItem('aimhigh_token');
        if (!token) {
            alert('Vui lòng đăng nhập để trò chuyện với AI Tutor!');
            window.location.href = 'login.html';
            return;
        }

        loadHistory();
        initControls();
    });

    // Load lịch sử từ localStorage
    function loadHistory() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            chatHistory = raw ? JSON.parse(raw) : [];
        } catch (e) {
            chatHistory = [];
        }

        if (chatHistory.length > 0) {
            if (welcomeBoard) welcomeBoard.style.display = 'none';
            chatHistory.forEach(msg => {
                appendMessageUI(msg.role, msg.text);
            });
            scrollToBottom();
        }
    }

    // Lưu lịch sử vào localStorage
    function saveHistory() {
        // Giới hạn lịch sử lưu trữ tối đa 20 tin nhắn gần nhất để tránh phình dung lượng
        if (chatHistory.length > 20) {
            chatHistory = chatHistory.slice(chatHistory.length - 20);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory));
    }

    // Khởi tạo các sự kiện
    function initControls() {
        chatInput.addEventListener('input', () => {
            sendBtn.disabled = chatInput.value.trim() === '';
        });

        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !sendBtn.disabled) {
                e.preventDefault();
                sendMessage();
            }
        });

        sendBtn.addEventListener('click', sendMessage);

        if (clearChatBtn) {
            clearChatBtn.addEventListener('click', () => {
                if (confirm('Bạn có muốn xóa toàn bộ lịch sử trò chuyện với AI không?')) {
                    chatHistory = [];
                    localStorage.removeItem(STORAGE_KEY);
                    chatContainer.innerHTML = '';
                    if (welcomeBoard) {
                        chatContainer.appendChild(welcomeBoard);
                        welcomeBoard.style.display = 'block';
                    }
                    if (typeof showToast === 'function') {
                        showToast('Đã xóa sạch lịch sử trò chuyện', 'success');
                    }
                }
            });
        }
    }

    // Gửi tin nhắn
    async function sendMessage(overrideText = '') {
        const text = (overrideText || chatInput.value).trim();
        if (!text) return;

        // Reset input
        if (!overrideText) {
            chatInput.value = '';
            sendBtn.disabled = true;
        }

        // Ẩn bảng chào mừng
        if (welcomeBoard && welcomeBoard.style.display !== 'none') {
            welcomeBoard.style.display = 'none';
        }

        // 1. Thêm tin nhắn user vào UI và History
        appendMessageUI('user', text);
        chatHistory.push({ role: 'user', text });
        saveHistory();
        scrollToBottom();

        // 2. Hiển thị "AI đang soạn tin..."
        const typingIndicator = showTypingIndicator();
        scrollToBottom();

        try {
            // Lấy 10 tin nhắn gần nhất làm ngữ cảnh hội thoại cho Gemini
            const contextHistory = chatHistory.slice(-10);

            // 3. Gọi API Backend
            if (typeof apiFetch !== 'function') {
                throw new Error('Hệ thống API chưa sẵn sàng. Vui lòng thử lại sau.');
            }

            const res = await apiFetch('/ai/chat', {
                method: 'POST',
                body: JSON.stringify({
                    message: text,
                    history: contextHistory
                })
            });

            // Ẩn typing indicator
            removeTypingIndicator(typingIndicator);

            const aiText = res?.data?.response || res?.response || 'Không có phản hồi từ AI.';
            
            // 4. Thêm tin nhắn AI vào UI và History
            appendMessageUI('model', aiText);
            chatHistory.push({ role: 'model', text: aiText });
            saveHistory();
            scrollToBottom();

        } catch (error) {
            removeTypingIndicator(typingIndicator);
            appendMessageUI('model', `Lỗi: ${error.message || 'Không thể kết nối máy chủ.'}`);
            scrollToBottom();
        }
    }

    // Hiển thị bong bóng tin nhắn trên giao diện
    function appendMessageUI(role, text) {
        const row = document.createElement('div');
        row.className = `message-row ${role === 'user' ? 'user' : 'bot'}`;

        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        
        // Convert \n sang <br> để xuống dòng hiển thị đẹp mắt
        const formattedText = escapeHtml(text).replace(/\n/g, '<br>');
        bubble.innerHTML = `<p>${formattedText}</p>`;

        row.appendChild(bubble);
        chatContainer.appendChild(row);
    }

    // Show indicator
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

    // Hide indicator
    function removeTypingIndicator(el) {
        if (el && el.parentNode) {
            el.parentNode.removeChild(el);
        } else {
            const fallback = document.getElementById('aiTypingIndicator');
            if (fallback) fallback.parentNode.removeChild(fallback);
        }
    }

    // Cuộn xuống cuối
    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // Helper phòng vệ chống mã độc XSS
    function escapeHtml(unsafe) {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    // Xuất hàm ra global để dùng cho các chip gợi ý nhanh
    window.sendSuggestion = function (text) {
        sendMessage(text);
    };
})();
