import { faker } from '@faker-js/faker';

const FAKER_PATTERN = /{{faker\.([^}]+)}}/g;

// Define specific field handlers
const fieldHandlers = {
  rating: (value) => {
    return Number(faker.number.float({ min: 1, max: 5, precision: 0.1 }));
  },
  price: (value) => {
    return Number(faker.commerce.price());
  },
  inStock: (value) => {
    return faker.datatype.boolean();
  },
  readTime: (value) => {
    return `${faker.number.int({ min: 1, max: 20 })} min`;
  }
};

function evaluateFakerExpression(expression, fieldName = '') {
  // Check if we have a specific handler for this field
  if (fieldHandlers[fieldName]) {
    return fieldHandlers[fieldName](expression);
  }

  // Regular faker expression handling
  try {
    const parts = expression.split('.');
    let value = faker;
    
    // Handle method with parameters
    if (expression.includes('(')) {
      const [methodPath, params] = expression.split('(');
      const methodParts = methodPath.split('.');
      
      for (const part of methodParts) {
        value = value[part];
      }
      
      if (typeof value === 'function') {
        const cleanParams = params.replace(')', '').trim();
        const paramObject = eval(`(${cleanParams})`);
        return value(paramObject);
      }
    } else {
      // Handle simple methods
      for (const part of parts) {
        value = value[part];
      }
      return typeof value === 'function' ? value() : value;
    }
  } catch (error) {
    console.error('Error generating value:', error);
    return 'Error generating value';
  }
}

export function generateDynamicData(template) {
  if (typeof template === 'string') {
    return template.replace(FAKER_PATTERN, (match, fakerPath) => {
      return evaluateFakerExpression(fakerPath);
    });
  }

  if (Array.isArray(template)) {
    return template.map(item => generateDynamicData(item));
  }

  if (typeof template === 'object' && template !== null) {
    const result = {};
    for (const [key, value] of Object.entries(template)) {
      if (typeof value === 'string' && value.includes('{{faker')) {
        // Use field-specific handler if available
        result[key] = evaluateFakerExpression(
          value.replace(FAKER_PATTERN, '$1'),
          key
        );
      } else {
        result[key] = generateDynamicData(value);
      }
    }
    return result;
  }

  return template;
}
