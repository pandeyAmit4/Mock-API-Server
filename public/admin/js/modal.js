import { showToast } from './toast.js';

export class ModalManager {
    constructor() {
        this.addModalStyles();
        this.currentModal = null;
        this.editMode = false;
        this.callback = null;
    }

    addModalStyles() {
        const style = document.createElement('style');
        style.textContent = `
            :root {
                --primary-color: #02506e;
                --primary-hover:rgb(5, 107, 147);
                --secondary-color: #64748b;
                --success-color: #22c55e;
                --danger-color: #ef4444;
                --warning-color: #f59e0b;
                --background-light: #f8fafc;
                --border-color: #e2e8f0;
            }

            .modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(15, 23, 42, 0.75);
                backdrop-filter: blur(4px);
                display: flex;
                justify-content: center;
                align-items: start;
                padding: 2rem;
                z-index: 1000;
                overflow-y: auto;
            }

            .modal-content {
                background: white;
                border-radius: 12px;
                width: 90%;
                max-width: 800px;
                box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
                max-height: 90vh;
                overflow-y: auto;
                animation: modalSlideIn 0.3s ease-out;
            }

            @keyframes modalSlideIn {
                from { transform: translateY(-20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }

            .modal-header {
                padding: 1.25rem 1.5rem;
                border-bottom: 1px solid var(--border-color);
                background: var(--background-light);
                border-radius: 12px 12px 0 0;
            }

            .modal-header h2 {
                margin: 0;
                color: var(--primary-color);
                font-size: 1.5rem;
                font-weight: 600;
            }

            .modal-body {
                padding: 1.5rem;
                background: white;
            }

            .form-group {
                margin-bottom: 1.5rem;
            }

            .form-group label {
                display: block;
                margin-bottom: 0.5rem;
                color: #1e293b;
                font-weight: 500;
            }

            .form-group input[type="text"],
            .form-group input[type="number"],
            .form-group textarea {
                width: 100%;
                padding: 0.75rem;
                border: 1px solid var(--border-color);
                border-radius: 6px;
                font-family: 'Monaco', 'Menlo', monospace;
                font-size: 0.9rem;
                transition: all 0.2s;
            }

            .form-group input:focus,
            .form-group textarea:focus {
                outline: none;
                border-color: var(--primary-color);
                box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
            }

            .form-group textarea {
                min-height: 120px;
                resize: vertical;
            }

            .checkbox-group {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 1rem;
                padding: 1.25rem;
                background: var(--background-light);
                border-radius: 8px;
                border: 1px solid var(--border-color);
            }

            .checkbox-group label {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-weight: normal;
                cursor: pointer;
                padding: 0.5rem;
                border-radius: 4px;
                transition: all 0.2s;
            }

            .checkbox-group label:hover {
                background: rgba(79, 70, 229, 0.05);
            }

            .setting-group {
                background: var(--background-light);
                padding: 1.25rem;
                border-radius: 8px;
                margin-bottom: 1rem;
                border: 1px solid var(--border-color);
                transition: all 0.2s;
            }
            .setting-group textarea {
                min-height: 100px;
                resize: vertical;
                width: 100%;
            }
            .setting-group:hover {
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            }

            .setting-group > label {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-weight: 500;
                margin-bottom: 1rem;
                cursor: pointer;
                color: #1e293b;
            }

            .nested-settings {
                background: white;
                padding: 1.25rem;
                border-radius: 6px;
                margin-top: 0.75rem;
                border: 1px solid var(--border-color);
                display: grid;
                gap: 1rem;
            }

            .modal-footer {
                padding: 1.25rem 1.5rem;
                border-top: 1px solid var(--border-color);
                display: flex;
                justify-content: flex-end;
                gap: 1rem;
                background: var(--background-light);
            }

            button {
                padding: 0.75rem 1.5rem;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.2s;
            }

            button.primary {
                background: var(--primary-color);
                color: white;
            }

            button.primary:hover {
                background: var(--primary-hover);
                transform: translateY(-1px);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }

            button.cancel {
                background: var(--secondary-color);
                color: white;
            }

            button.cancel:hover {
                background: #4b5563;
                transform: translateY(-1px);
            }

            .validation-error {
                color: var(--danger-color);
                font-size: 0.875rem;
                margin-top: 0.5rem;
            }

            input[type="checkbox"] {
                width: 1.1rem;
                height: 1.1rem;
                border-radius: 4px;
                border: 2px solid var(--secondary-color);
                cursor: pointer;
            }

            input[type="checkbox"]:checked {
                background-color: var(--primary-color);
                border-color: var(--primary-color);
            }
        `
        document.head.appendChild(style);
    }

    createRouteModal(existingRoute = null) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${existingRoute ? 'Edit Route' : 'Create New Route'}</h2>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Base Path:</label>
                        <input type="text" id="routePath" placeholder="/api/resources" required>
                        <div class="validation-error"></div>
                    </div>

                    <div class="form-group">
                        <label>HTTP Method:</label>
                        ${existingRoute ? 
                            `<input type="text" id="routeMethod" value="${existingRoute.method}" readonly>` :
                            `<div class="checkbox-group">
                                <label><input type="checkbox" id="opGet" checked> GET (List/Read)</label>
                                <label><input type="checkbox" id="opPost" checked> POST (Create)</label>
                                <label><input type="checkbox" id="opPut" checked> PUT (Update)</label>
                                <label><input type="checkbox" id="opDelete" checked> DELETE (Remove)</label>
                            </div>`
                        }
                    </div>

                    <div class="form-group">
                        <label>Response Template (JSON):</label>
                        <textarea id="responseTemplate" spellcheck="false">{
    "id": "{{faker.string.uuid}}",
    "name": "{{faker.commerce.productName}}",
    "description": "{{faker.commerce.productDescription}}"
}</textarea>
                        <div class="validation-error"></div>
                    </div>

                    <div class="setting-group">
                        <label><input type="checkbox" id="enableSchema"> Enable Schema Validation</label>
                        <textarea id="schemaTemplate" disabled spellcheck="false">{
    "name": "string",
    "description": "string"
}</textarea>
                    </div>

                    <div class="setting-group">
                        <label><input type="checkbox" id="enableError"> Enable Error Simulation</label>
                        <div id="errorSettings" class="nested-settings" style="display: none;">
                            <input type="number" id="errorProb" placeholder="Error Probability %" min="0" max="100" value="25">
                            <input type="number" id="errorStatus" placeholder="Error Status Code" min="400" max="599" value="500">
                            <input type="text" id="errorMessage" placeholder="Error Message" value="Simulated error">
                        </div>
                    </div>

                    <div class="setting-group">
                        <label><input type="checkbox" id="enableDelay"> Enable Response Delay</label>
                        <div id="delaySettings" class="nested-settings" style="display: none;">
                            <input type="number" id="delayMs" placeholder="Delay in milliseconds" min="0" value="1000">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="saveRouteBtn" class="primary">
                        ${existingRoute ? 'Update Route' : 'Create Routes'}
                    </button>
                    <button id="cancelModalBtn" class="cancel">Cancel</button>
                </div>
            </div>
        `;
        return modal;
    }

    show(existingRoute = null, callback = null) {
        this.editMode = !!existingRoute;
        this.callback = callback;
        this.currentModal = this.createRouteModal(existingRoute);
        document.body.appendChild(this.currentModal);
        this.setupModalEventListeners();

        if (existingRoute) {
            this.populateForm(existingRoute);
        }
    }

    close() {
        if (this.currentModal) {
            this.currentModal.remove();
            this.currentModal = null;
        }
    }

    setupModalEventListeners() {
        // Schema toggle
        document.getElementById('enableSchema').addEventListener('change', (e) => {
            document.getElementById('schemaTemplate').disabled = !e.target.checked;
        });

        // Error simulation toggle
        document.getElementById('enableError').addEventListener('change', (e) => {
            document.getElementById('errorSettings').style.display = 
                e.target.checked ? 'block' : 'none';
        });

        // Delay toggle
        document.getElementById('enableDelay').addEventListener('change', (e) => {
            document.getElementById('delaySettings').style.display = 
                e.target.checked ? 'block' : 'none';
        });

        // Close on outside click
        this.currentModal.addEventListener('click', (e) => {
            if (e.target === this.currentModal) {
                this.close();
            }
        });

        // Save/Create button click
        document.getElementById('saveRouteBtn').addEventListener('click', () => {
            const formData = this.getFormData();
            if (this.editMode && this.callback) {
                this.callback(formData);
                this.close();
            } else {
                routeManager.createRoutes();
            }
        });

        // Cancel button click
        document.getElementById('cancelModalBtn').addEventListener('click', () => {
            this.close();
        });

        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape' && this.currentModal) {
                this.close();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Add schema auto-generation on template change
        document.getElementById('responseTemplate').addEventListener('change', (e) => {
            if (document.getElementById('enableSchema').checked) {
                try {
                    const template = JSON.parse(e.target.value);
                    const schema = this.generateSchemaFromResponse(template);
                    document.getElementById('schemaTemplate').value = JSON.stringify(schema, null, 2);
                } catch (error) {
                    showToast('Invalid JSON in response template', 'error');
                }
            }
        });

        // Update schema when enabling schema validation
        document.getElementById('enableSchema').addEventListener('change', (e) => {
            const schemaTemplate = document.getElementById('schemaTemplate');
            schemaTemplate.disabled = !e.target.checked;
            
            if (e.target.checked) {
                try {
                    const template = JSON.parse(document.getElementById('responseTemplate').value);
                    const schema = this.generateSchemaFromResponse(template);
                    schemaTemplate.value = JSON.stringify(schema, null, 2);
                } catch (error) {
                    showToast('Invalid JSON in response template', 'error');
                }
            }
        });
    }

    populateForm(route) {
        // Base fields
        document.getElementById('routePath').value = route.path || '';
        
        // Response template
        if (route.response) {
            document.getElementById('responseTemplate').value = 
                typeof route.response === 'object' ? 
                JSON.stringify(route.response, null, 2) : route.response;
        }

        // Schema settings
        if (route.schema) {
            document.getElementById('enableSchema').checked = true;
            document.getElementById('schemaTemplate').disabled = false;
            document.getElementById('schemaTemplate').value = 
                typeof route.schema === 'object' ? 
                JSON.stringify(route.schema, null, 2) : route.schema;
        }

        // Error settings
        if (route.error?.enabled) {
            document.getElementById('enableError').checked = true;
            document.getElementById('errorSettings').style.display = 'block';
            document.getElementById('errorProb').value = route.error.probability || 25;
            document.getElementById('errorStatus').value = route.error.status || 500;
            document.getElementById('errorMessage').value = route.error.message || '';
        }

        // Delay settings
        if (route.delay) {
            document.getElementById('enableDelay').checked = true;
            document.getElementById('delaySettings').style.display = 'block';
            document.getElementById('delayMs').value = route.delay;
        }

        // Method - should be readonly in edit mode
        const methodInput = document.getElementById('routeMethod');
        if (methodInput) {
            methodInput.value = route.method;
            methodInput.disabled = true;
        }
    }

    generateSchemaFromResponse(response) {
        // Handle arrays or objects with collection names
        if (Array.isArray(response)) {
            return this.generateSchemaFromObject(response[0]);
        }

        // Handle response with collection wrapper (e.g., { users: [...] })
        const collectionKey = Object.keys(response).find(key => Array.isArray(response[key]));
        if (collectionKey && response[collectionKey].length > 0) {
            return this.generateSchemaFromObject(response[collectionKey][0]);
        }

        // Handle single object
        return this.generateSchemaFromObject(response);
    }

    generateSchemaFromObject(obj) {
        const schema = {};
        
        if (typeof obj === 'object' && obj !== null) {
            Object.entries(obj).forEach(([key, value]) => {
                // Skip id field as it's auto-generated
                if (key === 'id') return;

                // Handle faker template strings
                if (typeof value === 'string' && value.includes('{{faker.')) {
                    const fakerPath = value.match(/{{faker\.(.*?)}}/)[1];
                    const type = this.getFakerTemplateType(fakerPath);
                    schema[key] = type;
                } else {
                    // Handle regular values
                    schema[key] = this.getValueType(value);
                }
            });
        }
        
        return schema;
    }

    getFakerTemplateType(fakerPath) {
        // Map faker paths to schema types
        const typeMap = {
            'string': 'string',
            'number': 'number',
            'date': 'string',
            'internet.email': 'string',
            'internet.url': 'string',
            'person.firstName': 'string',
            'person.lastName': 'string',
            'person.fullName': 'string',
            'image.url': 'string',
            'image.avatar': 'string',
            'commerce.price': 'number',
            'commerce.productName': 'string',
            'commerce.productDescription': 'string',
            'boolean': 'boolean'
        };

        // Find matching type or default to string
        const matchingPath = Object.keys(typeMap).find(path => fakerPath.startsWith(path));
        return typeMap[matchingPath] || 'string';
    }

    getValueType(value) {
        if (Array.isArray(value)) return 'array';
        if (value === null) return 'string'; // Default to string for null values
        if (typeof value === 'object') return 'object';
        return typeof value;
    }

    getFormData() {
        try {
            const responseTemplate = document.getElementById('responseTemplate').value;
            let response;
            try {
                response = JSON.parse(responseTemplate);
            } catch (e) {
                response = responseTemplate;
            }

            const formData = {
                path: document.getElementById('routePath').value.trim(),
                method: document.getElementById('routeMethod')?.value || this.getSelectedMethod(),
                response,
                persist: true
            };

            // Schema validation settings
            if (document.getElementById('enableSchema').checked) {
                const schemaValue = document.getElementById('schemaTemplate').value;
                formData.schema = JSON.parse(schemaValue);
                formData.validateRequest = true;
            }

            // Error simulation settings
            if (document.getElementById('enableError').checked) {
                formData.error = {
                    enabled: true,
                    probability: parseInt(document.getElementById('errorProb').value) || 25,
                    status: parseInt(document.getElementById('errorStatus').value) || 500,
                    message: document.getElementById('errorMessage').value || 'Simulated error'
                };
            }

            // Delay settings
            if (document.getElementById('enableDelay').checked) {
                formData.delay = parseInt(document.getElementById('delayMs').value) || 1000;
            }

            return formData;
        } catch (error) {
            showToast('Invalid JSON in form data: ' + error.message, 'error');
            throw error;
        }
    }

    getSelectedMethod() {
        if (document.getElementById('opGet').checked) return 'GET';
        if (document.getElementById('opPost').checked) return 'POST';
        if (document.getElementById('opPut').checked) return 'PUT';
        if (document.getElementById('opDelete').checked) return 'DELETE';
        throw new Error('No HTTP method selected');
    }
}

export const modalManager = new ModalManager();
