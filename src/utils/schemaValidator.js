export class SchemaValidator {
  static validate(data, schema) {
    const errors = [];

    for (const [field, type] of Object.entries(schema)) {
      if (type === 'auto') continue; // Skip auto-generated fields

      if (!data.hasOwnProperty(field)) {
        errors.push(`Missing required field: ${field}`);
        continue;
      }

      const value = data[field];
      const actualType = typeof value;

      if (type === 'number' && actualType !== 'number') {
        errors.push(`Field ${field} must be a number, got ${actualType}`);
      } else if (type === 'string' && actualType !== 'string') {
        errors.push(`Field ${field} must be a string, got ${actualType}`);
      } else if (type === 'boolean' && actualType !== 'boolean') {
        errors.push(`Field ${field} must be a boolean, got ${actualType}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
