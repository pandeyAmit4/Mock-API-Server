let routes = [];
let hasUnsavedChanges = false;

async function loadRoutes() {
    try {
        const response = await fetch('/api/admin/routes');
        if (!response.ok) {
            throw new Error('Failed to load routes');
        }
        routes = await response.json();
        displayRoutes();
    } catch (error) {
        console.error('Load error:', error);
        alert('Error loading routes: ' + error.message);
    }
}

function displayRoutes() {
    const routesList = document.getElementById('routesList');
    routesList.innerHTML = routes.map((route, index) => `
        <div class="route-item" id="route-${index}">
            <div class="route-header">
                <h3>${route.method} ${route.path}</h3>
                <button onclick="deleteRoute(${index})">Delete</button>
            </div>
            <textarea
                class="json-editor"
                onchange="updateRoute(${index}, this.value)"
            >${JSON.stringify(route, null, 2)}</textarea>
        </div>
    `).join('');
}

async function saveRoutes() {
    try {
        const response = await fetch('/api/admin/routes', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(routes)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save routes');
        }

        const result = await response.json();
        alert('Routes saved successfully');
        
        // Reload routes to show updated configuration
        await loadRoutes();
        hideUnsavedChanges();
    } catch (error) {
        console.error('Save error:', error);
        alert('Error saving routes: ' + error.message);
    }
}

function updateRoute(index, value) {
    try {
        routes[index] = JSON.parse(value);
        showUnsavedChanges();
    } catch (error) {
        alert('Invalid JSON: ' + error.message);
    }
}

function deleteRoute(index) {
    routes.splice(index, 1);
    displayRoutes();
    showUnsavedChanges();
}

function addRoute() {
    const newRoute = {
        path: '/api/new-route',
        method: 'GET',
        response: { message: 'New route' },
        persist: false,
        statusCode: 200
    };
    
    // Add to beginning of array
    routes.unshift(newRoute);
    displayRoutes();

    // Scroll to newly added route
    const firstRoute = document.getElementById('route-0');
    if (firstRoute) {
        firstRoute.scrollIntoView({ behavior: 'smooth' });
        firstRoute.style.backgroundColor = '#f0f8ff'; // Highlight new route
        setTimeout(() => {
            firstRoute.style.backgroundColor = ''; // Remove highlight after 1s
        }, 1000);
    }
    showUnsavedChanges();
}

function showUnsavedChanges() {
    hasUnsavedChanges = true;
    document.getElementById('unsavedIndicator').style.display = 'inline';
    document.getElementById('saveRoutes').style.backgroundColor = '#dc3545';
}

function hideUnsavedChanges() {
    hasUnsavedChanges = false;
    document.getElementById('unsavedIndicator').style.display = 'none';
    document.getElementById('saveRoutes').style.backgroundColor = '#28a745';
}

async function resetStorage(path) {
    try {
        await fetch(`/api/admin/reset${path}`, { method: 'POST' });
        alert(`Storage reset for ${path}`);
    } catch (error) {
        alert('Error resetting storage: ' + error.message);
    }
}

// Event Listeners
document.getElementById('saveRoutes').addEventListener('click', saveRoutes);
document.getElementById('addRoute').addEventListener('click', addRoute);

// Tab handling
document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        button.classList.add('active');
        document.getElementById(button.dataset.tab).classList.add('active');
    });
});

// Add window beforeunload event
window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
        e.preventDefault();
        return e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    }
});

// Initial load
loadRoutes();
