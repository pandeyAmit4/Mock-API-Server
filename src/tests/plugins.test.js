import assert from 'assert';
import { pluginSystem } from '../utils/pluginSystem.js';
import { BasePlugin } from '../plugins/BasePlugin.js';
import { AuthPlugin } from '../plugins/AuthPlugin.js';

async function runPluginTests() {
    console.log('Starting Plugin Tests...\n');
    let totalTests = 0;
    let passedTests = 0;

    function test(name, fn) {
        totalTests++;
        try {
            fn();
            console.log(`✅ ${name}`);
            passedTests++;
        } catch (error) {
            console.error(`❌ ${name}`);
            console.error('Error:', error.message);
        }
    }

    // Plugin System Tests
    test('Should register valid plugin', () => {
        const plugin = new BasePlugin('test-plugin');
        pluginSystem.register(plugin);
        assert.ok(pluginSystem.plugins.has('test-plugin'));
    });

    test('Should reject duplicate plugin names', () => {
        const plugin1 = new BasePlugin('duplicate');
        const plugin2 = new BasePlugin('duplicate');
        
        pluginSystem.register(plugin1);
        assert.throws(() => {
            pluginSystem.register(plugin2);
        }, /Plugin duplicate is already registered/);
    });

    test('Should register multiple hooks for plugin', () => {
        const plugin = new BasePlugin('multi-hook');
        plugin.hooks = {
            beforeRequest: () => {},
            afterRequest: () => {},
            onError: () => {}
        };
        pluginSystem.register(plugin);
        assert.ok(pluginSystem.plugins.has('multi-hook'));
    });

    // Auth Plugin Tests
    test('Should validate API key in auth plugin', () => {
        const authPlugin = new AuthPlugin({ apiKey: 'test-key' });
        const mockReq = {
            headers: { authorization: 'test-key' },
            path: '/api/test'
        };
        const mockRes = {
            status: function(code) {
                this.statusCode = code;
                return this;
            },
            json: () => {}
        };
        let nextCalled = false;
        const next = () => { nextCalled = true; };

        authPlugin.checkAuth(mockReq, mockRes, next);
        assert.ok(nextCalled);
    });

    test('Should reject invalid API key', () => {
        const authPlugin = new AuthPlugin({ apiKey: 'test-key' });
        const mockReq = {
            headers: { authorization: 'wrong-key' },
            path: '/api/test'
        };
        let statusCode;
        const mockRes = {
            status: function(code) {
                statusCode = code;
                return this;
            },
            json: () => {}
        };
        const next = () => {};

        authPlugin.checkAuth(mockReq, mockRes, next);
        assert.strictEqual(statusCode, 401);
    });

    test('Should allow public routes without auth', () => {
        const authPlugin = new AuthPlugin({ apiKey: 'test-key' });
        const mockReq = {
            headers: {},
            path: '/public/test'
        };
        let nextCalled = false;
        const mockRes = {};
        const next = () => { nextCalled = true; };

        authPlugin.checkAuth(mockReq, mockRes, next);
        assert.ok(nextCalled);
    });

    // Test Summary
    console.log(`\nPlugin Test Summary: ${passedTests}/${totalTests} tests passed`);
}

runPluginTests().catch(console.error);
