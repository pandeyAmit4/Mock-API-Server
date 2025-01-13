import { showToast } from './toast.js';

export class ModalManager {
    constructor() {
        this.addModalStyles();
        this.currentModal = null;
    }

    addModalStyles() {
        const style = document.createElement('style');
        style.textContent = `
            :root {
                --primary-color: #4f46e5;
                --primary-hover: #4338ca;
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

    createRouteModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Create New Route</h2>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Base Path:</label>
                        <input type="text" id="routePath" placeholder="/api/resources" required>
                        <div class="validation-error"></div>
                    </div>

                    <div class="form-group">
                        <label>Operations:</label>
                        <div class="checkbox-group">
                            <label><input type="checkbox" id="opGet" checked> GET (List/Read)</label>
                            <label><input type="checkbox" id="opPost" checked> POST (Create)</label>
                            <label><input type="checkbox" id="opPut" checked> PUT (Update)</label>
                            <label><input type="checkbox" id="opDelete" checked> DELETE (Remove)</label>
                        </div>
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
                    <button id="createRoutesBtn" class="primary">Create Routes</button>
                    <button id="cancelModalBtn" class="cancel">Cancel</button>
                </div>
            </div>
        `;
        return modal;
    }

    show() {
        this.currentModal = this.createRouteModal();
        document.body.appendChild(this.currentModal);
        this.setupModalEventListeners();
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

        // Create button click
        document.getElementById('createRoutesBtn').addEventListener('click', () => {
            routeManager.createRoutes();
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
    }

    getFormData() {
        return {
            path: document.getElementById('routePath').value.trim(),
            operations: {
                get: document.getElementById('opGet').checked,
                post: document.getElementById('opPost').checked,
                put: document.getElementById('opPut').checked,
                delete: document.getElementById('opDelete').checked
            },
            template: document.getElementById('responseTemplate').value,
            schema: document.getElementById('enableSchema').checked ? 
                document.getElementById('schemaTemplate').value : null,
            error: document.getElementById('enableError').checked ? {
                enabled: true,
                probability: parseInt(document.getElementById('errorProb').value),
                status: parseInt(document.getElementById('errorStatus').value),
                message: document.getElementById('errorMessage').value
            } : null,
            delay: document.getElementById('enableDelay').checked ? 
                parseInt(document.getElementById('delayMs').value) : null
        };
    }
}

export const modalManager = new ModalManager();
