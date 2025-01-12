import { StorageManager } from '../utils/storage.js';
import { SchemaValidator } from '../utils/schemaValidator.js';
import { generateDynamicData } from '../utils/dataGenerator.js';
import { validateRouteConfig } from '../utils/validation.js';
import assert from 'assert';

async function runTests() {
  console.log('Starting tests...\n');
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

  // 1. Schema Validation Tests
  console.log('Running Schema Validation Tests...');
  const productSchema = {
    name: 'string',
    price: 'number',
    description: 'string',
    inStock: 'boolean'
  };

  test('Should validate correct product schema', () => {
    const validProduct = {
      name: 'Test Product',
      price: 99.99,
      description: 'A test product',
      inStock: true
    };
    const result = SchemaValidator.validate(validProduct, productSchema);
    assert.strictEqual(result.isValid, true);
  });

  test('Should reject invalid product types', () => {
    const invalidProduct = {
      name: 'Test Product',
      price: 'not a number',
      description: 123,
      inStock: 'not a boolean'
    };
    const result = SchemaValidator.validate(invalidProduct, productSchema);
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.errors.length, 3);
  });

  test('Should detect missing required fields', () => {
    const incompleteProduct = {
      name: 'Test Product'
    };
    const result = SchemaValidator.validate(incompleteProduct, productSchema);
    assert.strictEqual(result.isValid, false);
  });

  // 2. Storage Manager Tests
  console.log('\nRunning Storage Manager Tests...');
  const testPath = '/api/test-products';

  test('Should add and retrieve item', () => {
    const product = { name: 'Test Product', price: 99.99 };
    const added = StorageManager.add(testPath, product);
    assert.ok(added.id);
    const retrieved = StorageManager.getById(testPath, added.id);
    assert.deepStrictEqual(retrieved, added);
  });

  test('Should update existing item', () => {
    const product = { name: 'Original', price: 99.99 };
    const added = StorageManager.add(testPath, product);
    const updated = StorageManager.update(testPath, added.id, { ...product, name: 'Updated' });
    assert.strictEqual(updated.name, 'Updated');
  });

  test('Should delete existing item', () => {
    const product = { name: 'To Delete', price: 99.99 };
    const added = StorageManager.add(testPath, product);
    const deleted = StorageManager.delete(testPath, added.id);
    assert.strictEqual(deleted, true);
    const retrieved = StorageManager.getById(testPath, added.id);
    assert.strictEqual(retrieved, undefined);
  });

  // 3. Dynamic Data Generation Tests
  console.log('\nRunning Dynamic Data Generation Tests...');
  
  test('Should generate dynamic data from template', () => {
    const template = {
      id: "{{faker.string.uuid}}",
      name: "{{faker.person.fullName}}",
      email: "{{faker.internet.email}}"
    };
    const generated = generateDynamicData(template);
    assert.ok(generated.id);
    assert.ok(generated.name);
    assert.ok(generated.email);
  });

  test('Should handle nested dynamic data', () => {
    const template = {
      user: {
        id: "{{faker.string.uuid}}",
        profile: {
          name: "{{faker.person.fullName}}"
        }
      }
    };
    const generated = generateDynamicData(template);
    assert.ok(generated.user.id);
    assert.ok(generated.user.profile.name);
  });

  // 4. Storage Reset Tests
  console.log('\nRunning Storage Reset Tests...');

  test('Should reset storage to empty state', () => {
    StorageManager.add(testPath, { name: 'Test' });
    StorageManager.reset(testPath);
    const all = StorageManager.getAll(testPath);
    assert.strictEqual(all.length, 0);
  });

  test('Should preload data after reset', () => {
    const initialData = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' }
    ];
    StorageManager.reset(testPath, initialData);
    const all = StorageManager.getAll(testPath);
    assert.strictEqual(all.length, 2);
  });

  // 5. Error Simulation Tests
  console.log('\nRunning Error Simulation Tests...');

  test('Should handle error simulation configuration', () => {
    const route = {
        path: '/api/error-test',
        method: 'GET',
        response: { message: 'Success' },
        error: {
            enabled: true,
            probability: 50,
            status: 503,
            message: 'Test Error'
        }
    };
    
    // Verify route config is valid
    assert.doesNotThrow(() => {
        validateRouteConfig(route);
    });
    
    // Test probability calculation
    let errorCount = 0;
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
        const shouldError = Math.random() * 100 <= route.error.probability;
        if (shouldError) errorCount++;
    }

    const errorRate = (errorCount / iterations) * 100;
    assert.ok(errorRate > 30 && errorRate < 70, 
        `Error rate ${errorRate}% is too far from expected 50%`);
  });

  test('Should validate error configuration', () => {
    const invalidRoute = {
        path: '/api/invalid-error',
        method: 'GET',
        response: { message: 'Success' },
        error: {
            enabled: true,
            probability: 150, // Invalid: over 100
            status: 503,
            message: 'Test Error'
        }
    };
    
    let thrownError = null;
    try {
        validateRouteConfig(invalidRoute);
    } catch (error) {
        thrownError = error;
    }

    assert.ok(thrownError, 'Expected validation to throw an error');
    assert.strictEqual(
        thrownError.message,
        'Error probability must be between 0 and 100',
        'Incorrect error message'
    );
  });

  // Test Summary
  console.log(`\nTest Summary: ${passedTests}/${totalTests} tests passed`);
}

// Run all tests
runTests().catch(console.error);
