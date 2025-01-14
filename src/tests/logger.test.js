import { logger } from '../utils/logger.js';
import assert from 'assert';

async function runLoggerTests() {
    console.log('Starting Logger Tests...\n');
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

    test('Should log with correct format', () => {
        logger.clear();
        logger.info('Test message', { test: true });
        const logs = logger.getLogs();
        const lastLog = logs[0];
        
        assert.strictEqual(lastLog.level, 'info');
        assert.strictEqual(lastLog.message, 'Test message');
        assert.strictEqual(lastLog.test, true);
    });

    test('Should maintain max log size', () => {
        logger.clear();
        for (let i = 0; i < 1100; i++) {
            logger.info(`Log entry ${i}`);
        }
        const logs = logger.getLogs();
        assert.ok(logs.length <= 1000);
    });

    test('Should handle different log levels', () => {
        logger.clear();
        logger.error('Error message');
        logger.warn('Warning message');
        logger.info('Info message');
        logger.debug('Debug message');
        
        const logs = logger.getLogs();
        assert.ok(logs.some(log => log.level === 'error'));
        assert.ok(logs.some(log => log.level === 'warn'));
    });

    console.log(`\nLogger Test Summary: ${passedTests}/${totalTests} tests passed`);
}

runLoggerTests().catch(console.error);
