import { showToast } from "./toast.js"
import { validateRouteConfig, exportConfiguration, importConfiguration } from "./utils.js"
import { ModalManager } from "./modal.js"

export class RouteManager {
	constructor() {
		this.routes = []
		this.hasUnsavedChanges = false
		this.modalManager = new ModalManager()
		this.versionHistory = []
		this.filterTimeout = null
	}

	init() {
		this.loadRoutes()
		this.setupEventListeners()
		// Load initial version history if on versions tab
		if (document.querySelector('[data-tab="versions"].active')) {
			this.loadVersionHistory()
		}
	}

	setupEventListeners() {
		document.getElementById("saveRoutes").addEventListener("click", () => this.saveRoutes())
		document.getElementById("addRoute").addEventListener("click", () => this.addRoute())
		document.getElementById("loadSamples").addEventListener("click", () => this.loadSampleRoutes())
		document.getElementById("deleteAllRoutes").addEventListener("click", () => this.deleteAllRoutes())

		document.getElementById("refreshVersions")?.addEventListener("click", () => {
			this.loadVersionHistory()
		})

		// Load version history when switching to versions tab
		document.querySelector('[data-tab="versions"]')?.addEventListener("click", () => {
			this.loadVersionHistory()
		})

		// Add filter listeners
		const routeSearch = document.getElementById("routeSearch")
		const methodFilter = document.getElementById("routeMethodFilter")

		if (routeSearch) {
			routeSearch.addEventListener("input", () => this.applyFilters())
		}

		if (methodFilter) {
			methodFilter.addEventListener("change", () => this.applyFilters())
		}

		// Add floating button listener
		const addRouteFloat = document.getElementById("addRouteFloat")
		if (addRouteFloat) {
			addRouteFloat.addEventListener("click", () => this.modalManager.show())
		}

		// Add import/export handlers
		document.getElementById("importConfig").addEventListener("click", () => this.importRoutes())
		document.getElementById("exportConfig").addEventListener("click", () => this.exportRoutes())
	}

	applyFilters() {
		clearTimeout(this.filterTimeout)
		this.filterTimeout = setTimeout(() => {
			const searchText = document.getElementById("routeSearch")?.value?.toLowerCase() || ""
			const methodFilter = document.getElementById("routeMethodFilter")?.value || "all"

			const filteredRoutes = this.routes.filter((route) => {
				const matchesSearch = JSON.stringify(route).toLowerCase().includes(searchText)
				const matchesMethod = methodFilter === "all" || route.method === methodFilter
				return matchesSearch && matchesMethod
			})

			this.displayFilteredRoutes(filteredRoutes)
		}, 300)
	}

	displayFilteredRoutes(routes) {
		const routesList = document.getElementById("routesList")
		if (routesList) {
			routesList.innerHTML = routes.map((route, index) => createRouteItem(route, index)).join("")
		}
	}

	// Display and Update Methods
	displayRoutes() {
		const routesList = document.getElementById("routesList")
		routesList.innerHTML = this.routes.map((route, index) => createRouteItem(route, index)).join("")
	}

	editRoute(index) {
		const route = this.routes[index]
		console.log("Original route before edit:", route)
		this.modalManager.show(route, (updatedRoute) => {
			console.log("Updated route from modal:", updatedRoute)

			// Preserve settings and ensure they're properly structured
			const mergedRoute = {
				...route, // Keep existing settings
				...updatedRoute, // Apply updates
				persist: true,
				method: updatedRoute.method.toUpperCase(),
				 // Only include error settings if enabled in the form
				error: updatedRoute.error?.enabled ? updatedRoute.error : undefined,
				// Only include delay if it's set in the form
				delay: updatedRoute.delay || undefined,
				// Handle schema validation
				schema: updatedRoute.schema || undefined,
				validateRequest: (updatedRoute.method === "POST" || updatedRoute.method === "PUT") && updatedRoute.schema != null,
			}

			// Clean up undefined properties
			Object.keys(mergedRoute).forEach(key => 
				mergedRoute[key] === undefined && delete mergedRoute[key]
			);

			console.log("Final merged route:", mergedRoute)
			this.routes[index] = mergedRoute

			this.displayRoutes()
			this.showUnsavedChanges()
			showToast("Route updated successfully", "success")
		})
	}

	// API Methods
	async loadRoutes() {
		try {
			const response = await fetch("/api/admin/routes")
			if (!response.ok) throw new Error("Failed to load routes")
			const data = await response.json()
			// Ensure we set this.routes to the array
			this.routes = data.routes || []
			this.displayRoutes()
			this.updateRouteButtons()
		} catch (error) {
			console.error("Load error:", error)
			showToast("Error loading routes: " + error.message, "error")
		}
	}

	async loadSampleRoutes() {
		try {
			const response = await fetch("/api/admin/load-samples", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
				},
			})

			const contentType = response.headers.get("content-type")
			if (!contentType || !contentType.includes("application/json")) {
				throw new Error("Server returned non-JSON response")
			}

			const result = await response.json()

			if (!response.ok) {
				throw new Error(result.error || "Failed to load sample routes")
			}

			if (result.success) {
				showToast(`${result.count} sample routes loaded successfully`, "success")
				await this.loadRoutes()
				this.updateRouteButtons()
			} else {
				throw new Error(result.message || "Failed to load sample routes")
			}
		} catch (error) {
			console.error("Error loading samples:", error)
			showToast("Error loading sample routes: " + error.message, "error")
		}
	}

	async saveRoutes() {
		try {
			console.log("Saving routes:", this.routes)

			// Validate each route
			for (const route of this.routes) {
				try {
					const isValid = await validateRouteConfig(route)
					if (!isValid) {
						throw new Error(`Invalid route configuration: ${route.method} ${route.path}`)
					}
				} catch (error) {
					throw new Error(`Validation failed for route ${route.method} ${route.path}: ${error.message}`)
				}
			}

			const response = await fetch("/api/admin/routes", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: JSON.stringify(this.routes),
			})

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || "Failed to save routes")
			}

			const result = await response.json()
			console.log("Save result:", result)

			// Save version after successful save
			await fetch("/api/admin/versions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					routes: this.routes,
					description: `Manual save - ${new Date().toLocaleString()}`,
				}),
			})

			showToast("Routes saved successfully", "success")
			await this.loadRoutes()
			this.hideUnsavedChanges()
			this.updateRouteButtons()
		} catch (error) {
			console.error("Save error:", error)
			showToast(error.message, "error")
		}
	}

	async loadVersionHistory() {
		try {
			const response = await fetch("/api/admin/versions")
			this.versionHistory = await response.json()
			this.displayVersionHistory()
		} catch (error) {
			console.error("Error loading version history:", error)
		}
	}

	displayVersionHistory() {
		const historyList = document.getElementById("versionHistory")
		if (!historyList) return

		historyList.innerHTML = this.versionHistory
			.map(
				(version) => `
            <div class="version-item ${version.isCurrent ? "current" : ""}">
                <div class="version-header">
                    <span class="version-hash">${version.shortHash}</span>
                    <span class="version-time">${version.timestamp}</span>
                </div>
                <div class="version-description">${version.description}</div>
                <div class="version-routes">
                    ${version.metadata.routePaths ? version.metadata.routePaths.join(", ") : ""}
                </div>
                <div class="version-actions">
                    <button onclick="routeManager.rollbackVersion('${version.hash}')"
                            ${version.isCurrent ? "disabled" : ""}>
                        Rollback
                    </button>
                    <button onclick="routeManager.viewVersionDiff('${version.hash}')">
                        View Changes
                    </button>
                </div>
            </div>
        `
			)
			.join("")
	}

	async rollbackVersion(hash) {
		try {
			const response = await fetch(`/api/admin/versions/${hash}/rollback`, {
				method: "POST",
			})

			if (!response.ok) throw new Error("Failed to rollback")

			const routes = await response.json()
			this.routes = routes
			this.displayRoutes()
			this.showUnsavedChanges()
			showToast("Rolled back to previous version", "success")
			await this.loadVersionHistory()
		} catch (error) {
			showToast("Failed to rollback: " + error.message, "error")
		}
	}

	async viewVersionDiff(hash) {
		try {
			const response = await fetch(`/api/admin/versions/${hash}/diff`)
			const diff = await response.json()
			this.displayDiff(diff)
		} catch (error) {
			showToast("Failed to load diff: " + error.message, "error")
		}
	}

	displayDiff(diff) {
		const diffContent = document.querySelector(".diff-content")
		const versionDiff = document.getElementById("versionDiff")

		let html = ""

		if (diff.added.length) {
			html += '<div class="diff-added"><h4>Added Routes:</h4>'
			diff.added.forEach((route) => {
				html += `<div>${route.method} ${route.path}</div>`
			})
			html += "</div>"
		}

		if (diff.removed.length) {
			html += '<div class="diff-removed"><h4>Removed Routes:</h4>'
			diff.removed.forEach((route) => {
				html += `<div>${route.method} ${route.path}</div>`
			})
			html += "</div>"
		}

		if (diff.modified.length) {
			html += '<div class="diff-modified"><h4>Modified Routes:</h4>'
			diff.modified.forEach((change) => {
				html += `<div>${change.from.method} ${change.from.path}</div>`
			})
			html += "</div>"
		}

		diffContent.innerHTML = html
		versionDiff.style.display = "block"
	}

	// Route Management Methods
	updateRoute(index, value) {
		try {
			this.routes[index] = JSON.parse(value)
			this.showUnsavedChanges()
		} catch (error) {
			showToast("Invalid JSON format", "error")
		}
	}

	deleteRoute(index) {
		this.routes.splice(index, 1)
		this.displayRoutes()
		this.showUnsavedChanges()
		showToast("Route deleted", "warning")
	}

	duplicateRoute(index) {
		const newRoute = JSON.parse(JSON.stringify(this.routes[index]))
		newRoute.path += "_copy"
		this.routes.splice(index + 1, 0, newRoute)
		this.displayRoutes()
		this.showUnsavedChanges()
		showToast("Route duplicated", "info")
	}

	// UI State Methods
	showUnsavedChanges() {
		this.hasUnsavedChanges = true
		document.getElementById("unsavedIndicator").style.display = "inline"
		document.getElementById("saveRoutes").style.backgroundColor = "#dc3545"
	}

	hideUnsavedChanges() {
		this.hasUnsavedChanges = false
		document.getElementById("unsavedIndicator").style.display = "none"
		document.getElementById("saveRoutes").style.backgroundColor = "#28a745"
	}

	// Route Creation Methods
	addRoute() {
		this.modalManager.show()
	}

	async createRoutes() {
		const formData = this.modalManager.getFormData()
		const path = formData.path

		if (!path.startsWith("/api/")) {
			showToast("Path must start with /api/", "error")
			return
		}

		try {
			// Extract operations from form data checkboxes
			const template = formData.response || {}
			const schema = formData.schema
			const resourceName = path.split("/").pop()

			// Access checkboxes directly to ensure we get boolean values
			const operations = {
				get: document.getElementById("opGet")?.checked || false,
				post: document.getElementById("opPost")?.checked || false,
				put: document.getElementById("opPut")?.checked || false,
				delete: document.getElementById("opDelete")?.checked || false,
			}

			console.log("Operations from checkboxes:", operations)

			const newRoutes = this.generateRoutes(path, resourceName, template, schema, {
				...formData,
				operations,
			})

			if (newRoutes.length === 0) {
				showToast("No operations selected", "warning")
				return
			}

			// Validate routes with duplicate checking
			for (const route of newRoutes) {
				try {
					await validateRouteConfig(route, true)
				} catch (error) {
					showToast(`Validation failed: ${error.message}`, "error")
					return
				}
			}

			// Add routes and update UI
			this.routes.unshift(...newRoutes)
			this.displayRoutes()
			this.showUnsavedChanges()
			this.modalManager.close()
			showToast(`Created ${newRoutes.length} routes for ${resourceName}`, "success")
		} catch (error) {
			showToast(error.message || "Failed to create routes", "error")
		}
	}

	generateRoutes(path, resourceName, template, schema, formData) {
		console.log("Generating routes with formData:", formData)

		// Common configuration for all routes
		const baseConfig = {
			persist: true,
			// Apply error simulation settings if enabled
			...(formData.error && {
				error: {
					enabled: true,
					probability: parseInt(formData.error.probability) || 25,
					status: parseInt(formData.error.status) || 500,
					message: formData.error.message || "Simulated error",
				},
			}),
			// Apply delay if enabled
			...(formData.delay && { delay: parseInt(formData.delay) }),
		}

		// Configuration for write operations (POST, PUT)
		const writeConfig = {
			...baseConfig,
			schema: schema,
			validateRequest: true,
		}

		// Configuration for read operations (GET, DELETE)
		const readConfig = {
			...baseConfig,
			schema: null,
			validateRequest: false,
		}

		const newRoutes = []

		// GET collection
		if (formData.operations.get) {
			newRoutes.push({
				...readConfig,
				path: path,
				method: "GET",
				response: { [`${resourceName}s`]: [template] },
				statusCode: 200,
			})

			// GET single item
			newRoutes.push({
				...readConfig,
				path: `${path}/:id`,
				method: "GET",
				response: template,
				statusCode: 200,
			})
		}

		// POST new item
		if (formData.operations.post) {
			newRoutes.push({
				...writeConfig,
				path: path,
				method: "POST",
				response: template,
				statusCode: 201,
			})
		}

		// PUT update item
		if (formData.operations.put) {
			newRoutes.push({
				...writeConfig,
				path: `${path}/:id`,
				method: "PUT",
				response: template,
				statusCode: 200,
			})
		}

		// DELETE item
		if (formData.operations.delete) {
			newRoutes.push({
				...readConfig,
				path: `${path}/:id`,
				method: "DELETE",
				response: null,
				statusCode: 204,
			})
		}

		// Log the generated routes for debugging
		console.log("Generated routes:", JSON.stringify(newRoutes, null, 2))

		return newRoutes
	}

	async importRoutes() {
		try {
			const input = document.createElement("input")
			input.type = "file"
			input.accept = ".json"

			input.onchange = async (e) => {
				const file = e.target.files[0]
				if (!file) return

				try {
					const routes = await importConfiguration(file)

					// Validate all routes before importing
					for (const route of routes) {
						await validateRouteConfig(route, true)
					}

					this.routes = routes
					this.displayRoutes()
					this.showUnsavedChanges()
					showToast(`Successfully imported ${routes.length} routes`, "success")
				} catch (error) {
					showToast(error.message, "error")
				}
			}

			input.click()
		} catch (error) {
			console.error("Import error:", error)
			showToast("Failed to import routes: " + error.message, "error")
		}
	}

	exportRoutes() {
		try {
			exportConfiguration()
			showToast("Configuration exported successfully", "success")
		} catch (error) {
			console.error("Export error:", error)
			showToast("Failed to export routes: " + error.message, "error")
		}
	}

	updateRouteButtons() {
		const loadSamplesBtn = document.getElementById("loadSamples")
		const deleteAllBtn = document.getElementById("deleteAllRoutes")
		
		if (loadSamplesBtn) {
			loadSamplesBtn.style.display = this.routes.length === 0 ? "inline-flex" : "none"
		}
		
		if (deleteAllBtn) {
			deleteAllBtn.style.display = this.routes.length > 0 ? "inline-flex" : "none"
		}
	}

	async deleteAllRoutes() {
		if (!confirm("Are you sure you want to delete all routes?")) {
			return;
		}

		try {
			this.routes = [];
			await this.saveRoutes();
			this.displayRoutes();
			this.updateRouteButtons();
			showToast("All routes deleted successfully", "success");
		} catch (error) {
			console.error("Delete all error:", error);
			showToast("Failed to delete all routes: " + error.message, "error");
		}
	}

	updateErrorProbability(index, probability) {
		if (this.routes[index] && this.routes[index].error) {
			this.routes[index].error.probability = parseInt(probability);
			this.showUnsavedChanges();
		}
	}
}

function createRouteItem(route, index) {
	return `
        <div class="route-item">
            <div class="route-header">
                <div class="route-path">
                    <span class="method-badge method-${route.method.toLowerCase()}">${route.method}</span>
                    <span>${route.path}</span>
                </div>
                <div class="route-actions">
                    <button class="btn btn-primary" onclick="routeManager.editRoute(${index})">
                        <i class="material-icons">edit</i>
                        Edit
                    </button>
                    <button class="btn btn-danger" onclick="routeManager.deleteRoute(${index})">
                        <i class="material-icons">delete</i>
                        Delete
                    </button>
                </div>
            </div>
            
            <div class="route-content">
                <div class="route-section">
                    <h4>Response</h4>
                    <pre class="route-response">${JSON.stringify(route.response, null, 2)}</pre>
                </div>
                
                ${
									route.error?.enabled
										? `
                <div class="route-section">
                    <h4>Error Simulation</h4>
                    <div class="route-error-config">
                        <div class="error-probability">
                            <span class="probability-label">Probability: ${route.error.probability}%</span>
                            <input type="range" 
                                class="probability-slider" 
                                value="${route.error.probability}" 
                                min="0" 
                                max="100" 
                                oninput="routeManager.updateErrorProbability(${index}, this.value); this.previousElementSibling.textContent = 'Probability: ' + this.value + '%'">
                        </div>
                        <div>Status: ${route.error.status}</div>
                        <div>Message: ${route.error.message}</div>
                    </div>
                </div>
                `
										: ""
								}
            </div>
            
            <div class="route-meta">
                <span>Created: ${new Date(route.createdAt).toLocaleDateString()}</span>
                <span>Last Modified: ${new Date(route.updatedAt).toLocaleDateString()}</span>
            </div>
        </div>
    `
}

export const routeManager = new RouteManager()
