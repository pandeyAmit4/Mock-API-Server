export class SchemaValidator {
  static validate(data, schema) {
    const errors = [];

    // Helper function for type checking
    const checkType = (value, expectedType, path = '') => {
      if (expectedType === 'auto') return true;
      
      if (value === null || value === undefined) {
        errors.push(`${path} is required`);
        return false;
      }

      switch (expectedType) {
        case 'string':
          return typeof value === 'string';
        case 'number':
          return typeof value === 'number' && !isNaN(value);
        case 'boolean':
          return typeof value === 'boolean';
        case 'array':
          return Array.isArray(value);
        case 'object':
          return typeof value === 'object' && !Array.isArray(value);
        default:
          if (typeof expectedType === 'object') {
            // Handle nested objects
            return this.validate(value, expectedType).isValid;
          }
          return false;      }
    };

    // Validate each field in schema
    for (const [field, type] of Object.entries(schema)) {
      if (!data.hasOwnProperty(field) && type !== 'auto') {
        errors.push(`Missing required field: ${field}`);
        continue;
      }

      const value = data[field];
      const isValidType = checkType(value, type, field);

      if (!isValidType && type !== 'auto') {
        errors.push(`Field ${field} must be of type ${type}, got ${typeof value}`);
      }

      // Validate nested objects
      if (type === 'object' && value && schema[field].properties) {
        const nestedValidation = this.validate(value, schema[field].properties);
        if (!nestedValidation.isValid) {
          errors.push(...nestedValidation.errors.map(e => `${field}.${e}`));
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
