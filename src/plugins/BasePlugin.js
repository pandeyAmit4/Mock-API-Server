export class BasePlugin {
    constructor(name, options = {}) {
        this.name = name;
        this.options = options;
        this.hooks = {};
    }

    beforeRequest(req, res, next) {}
    afterRequest(req, res) {}
    beforeResponse(req, res, data) {}
    onError(error, req, res) {}
    onRouteLoad(route) {}
}
