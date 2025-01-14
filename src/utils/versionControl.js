export class RouteVersionControl {
    constructor() {
        this.versions = new Map();
        this.currentVersion = null;
    }

    // Bug: Missing error handling for crypto operations
    async generateHash(routes) {
        try {
            return crypto.subtle.digest('SHA-256', 
                new TextEncoder().encode(JSON.stringify(routes))
            ).then(buffer => {
                return Array.from(new Uint8Array(buffer))
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('');
            });
        } catch (error) {
            throw new Error('Failed to generate hash: ' + error.message);
        }
    }

    async saveVersion(routes, description = '') {
        const timestamp = Date.now();
        const hash = await this.generateHash(routes);
        
        const version = {
            hash,
            timestamp,
            description,
            routes: JSON.stringify(routes),
            metadata: {
                routeCount: routes.length,
                routePaths: routes.map(r => `${r.method.toUpperCase()} ${r.path}`),
                createdAt: new Date().toISOString()
            }
        };

        this.versions.set(hash, version);
        this.currentVersion = hash;
        return version;
    }

    async rollback(hash) {
        const version = this.versions.get(hash);
        if (!version) {
            throw new Error('Version not found');
        }
        this.currentVersion = hash;
        return JSON.parse(version.routes);
    }

    getVersionHistory() {
        return Array.from(this.versions.values())
            .sort((a, b) => b.timestamp - a.timestamp)
            .map(v => ({
                hash: v.hash,             // keep the full hash
                shortHash: v.hash.substring(0, 8), // for display
                timestamp: new Date(v.timestamp).toLocaleString(),
                description: v.description,
                metadata: v.metadata,
                isCurrent: v.hash === this.currentVersion
            }));
    }

    getCurrentVersion() {
        return this.versions.get(this.currentVersion);
    }

    diffVersions(hashA, hashB) {
        const versionA = JSON.parse(this.versions.get(hashA).routes);
        const versionB = JSON.parse(this.versions.get(hashB).routes);

        const changes = {
            added: [],
            removed: [],
            modified: []
        };

        const routeKey = route => `${route.method}:${route.path}`;
        const routeMapA = new Map(versionA.map(r => [routeKey(r), r]));
        const routeMapB = new Map(versionB.map(r => [routeKey(r), r]));

        // Find added and modified routes
        for (const [key, route] of routeMapB) {
            if (!routeMapA.has(key)) {
                changes.added.push(route);
            } else if (JSON.stringify(routeMapA.get(key)) !== JSON.stringify(route)) {
                changes.modified.push({
                    from: routeMapA.get(key),
                    to: route
                });
            }
        }

        // Find removed routes
        for (const [key, route] of routeMapA) {
            if (!routeMapB.has(key)) {
                changes.removed.push(route);
            }
        }

        return changes;
    }
}

export const versionControl = new RouteVersionControl();
