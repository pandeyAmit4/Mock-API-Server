import { StorageManager } from '../utils/storage.js';
import assert from 'assert';

async function runStorageTests() {
    console.log('Starting Storage Tests...\n');
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

    const testPath = '/api/test-products';

    // Collection Management Tests
    test('Should maintain correct collection name format', () => {
        const data = { name: 'Test' };
        StorageManager.add(testPath, data);
        const result = StorageManager.getAll(testPath);
        assert.ok(result['test-products']); // Should use hyphenated collection name
    });

    test('Should handle batch operations', () => {
        const items = [
            { name: 'Item 1' },
            { name: 'Item 2' }
        ];
        StorageManager.reset(testPath); // Reset first to ensure clean state
        StorageManager.addBatch(testPath, items);
        const result = StorageManager.getAll(testPath);
        const resourceKey = `${testPath.split('/').pop()}s`;
        assert.strictEqual(result[resourceKey].length, 2); // Check length of the correct collection
    });

    test('Should handle nested paths correctly', () => {
        const nestedPath = '/api/users/:userId/posts';
        const post = { title: 'Test Post' };
        const resolvedPath = '/api/users/123/posts';
        StorageManager.reset(resolvedPath); // Reset the resolved path
        StorageManager.add(resolvedPath, post); // Use resolved path directly
        const result = StorageManager.getAll(resolvedPath);
        assert.ok(result['posts'].length > 0);
    });

    // Data Persistence Tests
    test('Should persist data between operations', () => {
        const item = { name: 'Persist Test' };
        const added = StorageManager.add(testPath, item);
        StorageManager.update(testPath, added.id, { name: 'Updated' });
        const result = StorageManager.getById(testPath, added.id);
        assert.strictEqual(result.name, 'Updated');
    });

    // Query Tests
    test('Should filter by field value', () => {
        StorageManager.reset(testPath);
        const items = [
            { type: 'A', value: 1 },
            { type: 'B', value: 2 },
            { type: 'A', value: 3 }
        ];
        StorageManager.addBatch(testPath, items);
        const filtered = StorageManager.query(testPath, { type: 'A' });
        assert.strictEqual(filtered.length, 2);
    });

    test('Should sort results', () => {
        const items = [
            { value: 3 },
            { value: 1 },
            { value: 2 }
        ];
        StorageManager.reset(testPath);
        StorageManager.addBatch(testPath, items);
        const sorted = StorageManager.query(testPath, {}, { sort: { value: 'asc' } });
        assert.strictEqual(sorted[0].value, 1);
    });

    console.log(`\nStorage Test Summary: ${passedTests}/${totalTests} tests passed`);
}

runStorageTests().catch(console.error);
