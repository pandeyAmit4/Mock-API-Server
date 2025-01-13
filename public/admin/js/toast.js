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
    const options = {
        type: type,
        dismissible: true,
        styles: {
            [type]: {
                container: {
                    backgroundColor: getToastColor(type),
                    color: type === 'warning' ? '#000' : '#fff'
                },
                progressBar: {
                    backgroundColor: getProgressBarColor(type)
                }
            }
        }
    };

    toastNotifier.show(message, options);
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
