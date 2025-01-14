import { ModalManager } from '../../public/admin/js/modal.js';
import assert from 'assert';

async function runModalManagerTests() {
    console.log('Starting Modal Manager Tests...\n');
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

    const modalManager = new ModalManager();

    // Schema Generation Tests
    test('Should generate schema from basic response', () => {
        const response = {
            name: '{{faker.person.fullName}}',
            email: '{{faker.internet.email}}'
        };
        const schema = modalManager.generateSchemaFromResponse(response);
        assert.strictEqual(schema.name, 'string');
        assert.strictEqual(schema.email, 'string');
    });

    test('Should handle nested objects in schema generation', () => {
        const response = {
            user: {
                name: '{{faker.person.fullName}}',
                address: {
                    city: '{{faker.location.city}}'
                }
            }
        };
        const schema = modalManager.generateSchemaFromResponse(response);
        assert.strictEqual(typeof schema.user, 'object');
    });

    test('Should handle array responses', () => {
        const response = {
            items: [
                { id: '{{faker.string.uuid}}' }
            ]
        };
        const schema = modalManager.generateSchemaFromResponse(response);
        assert.strictEqual(schema.items, 'array');
    });

    // Form Data Tests
    test('Should validate form data structure', () => {
        const formData = {
            path: '/api/test',
            method: 'GET',
            response: { test: true },
            schema: { test: 'boolean' }
        };
        assert.doesNotThrow(() => modalManager.validateFormData(formData));
    });

    console.log(`\nModal Manager Test Summary: ${passedTests}/${totalTests} tests passed`);
}

runModalManagerTests().catch(console.error);
