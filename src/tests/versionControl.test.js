import { versionControl } from '../utils/versionControl.js';
import assert from 'assert';

async function runVersionControlTests() {
    console.log('Starting Version Control Tests...\n');
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

    test('Should create new version', async () => {
        const routes = [{ path: '/api/test', method: 'GET' }];
        const version = await versionControl.saveVersion(routes, 'Test version');
        assert.ok(version.hash);
        assert.ok(version.timestamp);
    });

    test('Should track version changes correctly', async () => {
        const initialRoutes = [{ path: '/api/test', method: 'GET' }];
        await versionControl.saveVersion(initialRoutes, 'Initial');
        
        const updatedRoutes = [...initialRoutes, { path: '/api/new', method: 'POST' }];
        await versionControl.saveVersion(updatedRoutes, 'Updated');
        
        const history = versionControl.getVersionHistory();
        assert.strictEqual(history.length, 2);
    });

    test('Should generate correct diff', async () => {
        const v1Routes = [{ path: '/api/test', method: 'GET' }];
        const v1 = await versionControl.saveVersion(v1Routes, 'V1');
        
        const v2Routes = [{ path: '/api/test2', method: 'POST' }];
        const v2 = await versionControl.saveVersion(v2Routes, 'V2');
        
        const diff = versionControl.diffVersions(v1.hash, v2.hash);
        assert.ok(diff.added.length > 0 || diff.removed.length > 0);
    });

    console.log(`\nVersion Control Test Summary: ${passedTests}/${totalTests} tests passed`);
}

runVersionControlTests().catch(console.error);
