document.addEventListener('DOMContentLoaded', () => {
    // --- Chatbot UI Elements ---
    const chatbotWidget = document.getElementById('chatbot-widget');
    const chatbotToggle = document.getElementById('chatbot-toggle');
    const chatbotBubble = document.getElementById('chatbot-bubble');
    const chatbotForm = document.getElementById('chatbot-form');
    const chatbotInput = document.getElementById('chatbot-input');
    const chatbotMessages = document.getElementById('chatbot-messages');
    const chatbotSendBtn = document.querySelector('.chatbot-send');

    // --- Toggle Chatbot Visibility ---
    const toggleChat = () => {
        chatbotWidget.classList.toggle('collapsed');
        if (!chatbotWidget.classList.contains('collapsed')) {
            chatbotInput.focus();
        } else {
            // Reset position when closed
            chatbotWidget.style.transform = '';
            chatbotWidget.style.bottom = '';
            chatbotWidget.style.right = '';
            chatbotWidget.style.left = '';
            chatbotWidget.style.top = '';
            currentX = 0;
            currentY = 0;
        }
    };

    chatbotToggle.addEventListener('click', toggleChat);
    chatbotBubble.addEventListener('click', toggleChat);

    // --- Draggable Functionality ---
    const chatbotHeader = document.getElementById('chatbot-header');

    let isDragging = false;
    let startX, startY;
    let currentX = 0;
    let currentY = 0;

    chatbotHeader.addEventListener('mousedown', dragStart);
    chatbotHeader.addEventListener('touchstart', dragStart, { passive: false });

    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', dragEnd);

    function dragStart(e) {
        if (e.target === chatbotToggle || chatbotToggle.contains(e.target)) return;

        // Prevent drag if it is collapsed
        if (chatbotWidget.classList.contains('collapsed')) return;

        // Get the computed style of the widget to find its actual current position on the screen
        const rect = chatbotWidget.getBoundingClientRect();

        if (e.type === 'touchstart') {
            startX = e.touches[0].clientX - rect.left;
            startY = e.touches[0].clientY - rect.top;
        } else {
            startX = e.clientX - rect.left;
            startY = e.clientY - rect.top;
        }
        isDragging = true;
    }

    function drag(e) {
        if (!isDragging) return;
        e.preventDefault();

        // Calculate the new coordinates relative to the viewport
        let newX, newY;
        if (e.type === 'touchmove') {
            newX = e.touches[0].clientX - startX;
            newY = e.touches[0].clientY - startY;
        } else {
            newX = e.clientX - startX;
            newY = e.clientY - startY;
        }

        // Ensure the chatbot stays within the viewport boundaries
        const maxX = window.innerWidth - chatbotWidget.offsetWidth;
        const maxY = window.innerHeight - chatbotWidget.offsetHeight;

        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));

        // Remove bottom/right constraints since we are moving it manually from top left
        chatbotWidget.style.bottom = 'auto';
        chatbotWidget.style.right = 'auto';
        chatbotWidget.style.left = `${newX}px`;
        chatbotWidget.style.top = `${newY}px`;
        chatbotWidget.style.transform = 'none'; // Clear any transform
    }

    function dragEnd(e) {
        isDragging = false;
    }

    // --- Add Message to UI ---
    const addMessageToUI = (text, sender) => {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');

        if (sender === 'user') {
            messageDiv.classList.add('user-message');
        } else if (sender === 'ai') {
            messageDiv.classList.add('ai-message');
        }

        messageDiv.textContent = text;
        chatbotMessages.appendChild(messageDiv);
        scrollToBottom();
    };

    // --- Add/Remove Typing Indicator ---
    const showTypingIndicator = () => {
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('chatbot-typing');
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = '<span></span><span></span><span></span>';
        chatbotMessages.appendChild(typingDiv);
        scrollToBottom();
    };

    const removeTypingIndicator = () => {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    };

    // --- Always scroll to newest message ---
    const scrollToBottom = () => {
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    };

    // --- Submit Message / Simulated Webhook Communication ---
    chatbotForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const messageText = chatbotInput.value.trim();
        if (!messageText) return;

        // 1. Display user message
        addMessageToUI(messageText, 'user');
        chatbotInput.value = '';

        // Disable input while processing
        chatbotInput.disabled = true;
        chatbotSendBtn.disabled = true;

        // 2. Show typing indicator
        showTypingIndicator();

        // 3. Simulate webhook call (since Node is unavailable)
        try {
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay

            // Format mock response to match requested JSON format { "reply": "..." }
            let responseText = "I can definitely help with that! Our automation systems are designed to streamline your operations. Since I'm currently running in a demo mode without a live API connection, I recommend exploring our 'Services' or 'Pricing' sections above, or booking a free consultation to learn more!";

            // Very simple local routing for the mock
            const msgLower = messageText.toLowerCase();
            if (msgLower.includes("instagram") || msgLower.includes("facebook") || msgLower.includes("social")) {
                responseText = "Yes. Our automation systems can automatically reply to common customer inquiries on platforms like Instagram.\nFor most businesses our Growth Automation plan works best. Would you like help choosing the right setup?";
            } else if (msgLower.includes("price") || msgLower.includes("cost") || msgLower.includes("how much") || msgLower.includes("plan")) {
                responseText = "Our plans start at ₹4,999 for Starter Setup, scaling up to ₹24,999 for Pro Automation. We also offer full Business Website Packages. You can see the full breakdown in the Pricing section!";
            } else if (msgLower.includes("lead") || msgLower.includes("capture") || msgLower.includes("crm")) {
                responseText = "Lead capture is included in all our plans! It helps you automatically organize and track customer inquiries so you never miss a sale.";
            } else if (msgLower.includes("hello") || msgLower.includes("hi") || msgLower.includes("hey")) {
                responseText = "Hello! How can I help you automate your business today?";
            }

            const mockWebhookResponse = { reply: responseText };

            // 4. Remove typing indicator & show AI response
            removeTypingIndicator();
            addMessageToUI(mockWebhookResponse.reply, 'ai');

        } catch (error) {
            console.error("Chatbot Error:", error);
            removeTypingIndicator();
            addMessageToUI("There was a network error. Please try again later.", 'ai');
        } finally {
            // Re-enable input
            chatbotInput.disabled = false;
            chatbotSendBtn.disabled = false;
            chatbotInput.focus();
        }
    });

    // --- Intersection Observer for Scroll Animations ---
    const revealElements = document.querySelectorAll('.reveal-on-scroll, .reveal-image-on-scroll');
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target); // Animate only once
            }
        });
    }, {
        root: null,
        threshold: 0.1, // Trigger when 10% of element is visible
        rootMargin: "0px"
    });

    revealElements.forEach(el => revealObserver.observe(el));

    // --- Mobile Hamburger Menu Toggle ---
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('open');
            // Toggle between ☰ and ✕
            mobileMenuBtn.textContent = mobileMenu.classList.contains('open') ? '\u2715' : '\u2630';
        });

        // Close menu when a link is clicked
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.remove('open');
                mobileMenuBtn.textContent = '\u2630';
            });
        });
    }

    // --- Service Page: Scroll-Spy for Service Nav ---
    const serviceNav = document.getElementById('service-nav');
    if (serviceNav) {
        const navLinks = serviceNav.querySelectorAll('.service-nav-link');
        const sections = [];
        navLinks.forEach(link => {
            const id = link.getAttribute('href').replace('#', '');
            const section = document.getElementById(id);
            if (section) sections.push({ id, section, link });
        });

        const spyObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    navLinks.forEach(l => l.classList.remove('active'));
                    const match = sections.find(s => s.id === entry.target.id);
                    if (match) match.link.classList.add('active');
                }
            });
        }, { root: null, threshold: 0.3, rootMargin: '-80px 0px -50% 0px' });

        sections.forEach(s => spyObserver.observe(s.section));

        // Smooth scroll on nav click
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const id = link.getAttribute('href').replace('#', '');
                const target = document.getElementById(id);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }
});

