import { LogsManager } from '../../public/admin/js/logs.js';
import assert from 'assert';

async function runLogsManagerTests() {
    console.log('Starting Logs Manager Tests...\n');
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

    const logsManager = new LogsManager();

    test('Should filter logs by method', () => {
        logsManager.logs = new Map([
            ['1', { method: 'GET', path: '/test' }],
            ['2', { method: 'POST', path: '/test' }]
        ]);
        
        const filtered = logsManager.getFilteredLogs('GET', 'all', '');
        assert.strictEqual(filtered.length, 1);
    });

    test('Should filter logs by time range', () => {
        const now = Date.now();
        logsManager.logs = new Map([
            ['1', { timestamp: now, method: 'GET' }],
            ['2', { timestamp: now - 3600000, method: 'GET' }] // 1 hour ago
        ]);
        
        const filtered = logsManager.getFilteredLogs('all', '15m', '');
        assert.strictEqual(filtered.length, 1);
    });

    test('Should handle log expansion state', () => {
        const logId = 'test-log-1';
        logsManager.expandedStates.add(logId);
        assert.ok(logsManager.expandedStates.has(logId));
        
        logsManager.collapseAllLogs();
        assert.strictEqual(logsManager.expandedStates.size, 0);
    });

    console.log(`\nLogs Manager Test Summary: ${passedTests}/${totalTests} tests passed`);
}

runLogsManagerTests().catch(console.error);
