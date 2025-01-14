let activeToasts = [];
const TOAST_DURATION = 3000;

// Ensure toast container exists
function ensureContainer() {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
}

export const toastNotifier = new jsToastNotifier.ToastNotifier({
    position: 'top-right',
    animation: 'slide',
    theme: 'light',
    progressBar: true,
    closeButton: true,
    pauseOnHover: true,
    duration: 3000,
    maxToasts: 5,
    icons: true,
    offset: { x: 20, y: 20 }
});

export function showToast(message, type = 'info') {
    const container = ensureContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Add message
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    toast.appendChild(messageSpan);
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.className = 'toast-close';
    closeBtn.onclick = () => removeToast(toast);
    toast.appendChild(closeBtn);
    
    container.appendChild(toast);
    activeToasts.push(toast);
    
    // Position toasts with spacing
    repositionToasts();
    
    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Auto remove
    setTimeout(() => removeToast(toast), TOAST_DURATION);
}

function removeToast(toast) {
    toast.classList.remove('show');
    setTimeout(() => {
        toast.remove();
        activeToasts = activeToasts.filter(t => t !== toast);
        repositionToasts();
    }, 300);
}

function repositionToasts() {
    activeToasts.forEach((toast, index) => {
        const offset = index * (toast.offsetHeight + 8);
        toast.style.transform = `translateY(-${offset}px)`;
    });
}

function getToastColor(type) {
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        info: '#17a2b8',
        warning: '#ffc107'
    };
    return colors[type] || colors.info;
}

function getProgressBarColor(type) {
    const colors = {
        success: '#1e7e34',
        error: '#bd2130',
        info: '#117a8b',
        warning: '#d39e00'
    };
    return colors[type] || colors.info;
}
