export const sampleRoutes = [
    // Basic CRUD for users
    {
        path: "/api/users",
        method: "GET",
        response: {
            users: [{
                id: "{{faker.string.uuid}}",
                firstName: "{{faker.person.firstName}}",
                lastName: "{{faker.person.lastName}}",
                email: "{{faker.internet.email}}",
                avatar: "{{faker.image.avatar}}"
            }]
        },
        persist: true,
        statusCode: 200
    },
    {
        path: "/api/users/:id",
        method: "GET",
        response: {
            id: "{{faker.string.uuid}}",
            firstName: "{{faker.person.firstName}}",
            lastName: "{{faker.person.lastName}}",
            email: "{{faker.internet.email}}",
            avatar: "{{faker.image.avatar}}"
        },
        persist: true,
        statusCode: 200
    },
    {
        path: "/api/users",
        method: "POST",
        response: {
            id: "{{faker.string.uuid}}",
            firstName: "{{faker.person.firstName}}",
            lastName: "{{faker.person.lastName}}",
            email: "{{faker.internet.email}}"
        },
        persist: true,
        statusCode: 201,
        schema: {
            firstName: "string",
            lastName: "string",
            email: "string",
            age: "number",
            settings: {
                type: "object",
                properties: {
                    newsletter: "boolean",
                    theme: "string"
                }
            }
        }
    },
    {
        path: "/api/users/:id",
        method: "PUT",
        response: {
            id: "{{faker.string.uuid}}",
            firstName: "{{faker.person.firstName}}",
            lastName: "{{faker.person.lastName}}",
            email: "{{faker.internet.email}}"
        },
        persist: true,
        statusCode: 200
    },
    {
        path: "/api/users/:id",
        method: "DELETE",
        persist: true,
        statusCode: 204
    },

    // Products with complex response structure
    {
        path: "/api/products",
        method: "GET",
        response: {
            products: [{
                id: "{{faker.string.uuid}}",
                name: "{{faker.commerce.productName}}",
                price: "{{faker.commerce.price}}",
                category: "{{faker.commerce.department}}",
                details: {
                    description: "{{faker.commerce.productDescription}}",
                    material: "{{faker.commerce.productMaterial}}",
                    manufacturer: "{{faker.company.name}}"
                },
                stock: {
                    quantity: "{{faker.number.int({ min: 0, max: 100 })}}",
                    warehouse: "{{faker.location.city}}",
                    reorderPoint: "{{faker.number.int({ min: 5, max: 20 })}}"
                },
                ratings: {
                    average: "{{faker.number.float({ min: 1, max: 5, precision: 0.1 })}}",
                    count: "{{faker.number.int({ min: 0, max: 1000 })}}"
                }
            }]
        },
        persist: true,
        statusCode: 200
    },

    // Orders with nested structure and relationships
    {
        path: "/api/orders",
        method: "GET",
        response: {
            orders: [{
                id: "{{faker.string.uuid}}",
                orderDate: "{{faker.date.recent}}",
                status: "{{faker.helpers.arrayElement(['pending', 'processing', 'shipped', 'delivered'])}}",
                customer: {
                    id: "{{faker.string.uuid}}",
                    name: "{{faker.person.fullName}}",
                    email: "{{faker.internet.email}}"
                },
                items: [
                    {
                        id: "{{faker.string.uuid}}",
                        productId: "{{faker.string.uuid}}",
                        name: "{{faker.commerce.productName}}",
                        quantity: "{{faker.number.int({ min: 1, max: 5 })}}",
                        price: "{{faker.commerce.price}}"
                    },
                    {
                        id: "{{faker.string.uuid}}",
                        productId: "{{faker.string.uuid}}",
                        name: "{{faker.commerce.productName}}",
                        quantity: "{{faker.number.int({ min: 1, max: 5 })}}",
                        price: "{{faker.commerce.price}}"
                    }
                ],
                shipping: {
                    address: "{{faker.location.streetAddress}}",
                    city: "{{faker.location.city}}",
                    country: "{{faker.location.country}}",
                    trackingNumber: "{{faker.string.alphanumeric(10)}}"
                },
                payment: {
                    method: "{{faker.helpers.arrayElement(['credit_card', 'paypal', 'bank_transfer'])}}",
                    status: "{{faker.helpers.arrayElement(['pending', 'completed', 'failed'])}}"
                }
            }]
        },
        persist: true,
        statusCode: 200
    },

    // Simple endpoints with error simulation
    {
        path: "/api/health",
        method: "GET",
        response: {
            status: "healthy",
            timestamp: "{{faker.date.recent}}",
            version: "1.0.0"
        },
        persist: false,
        statusCode: 200,
        error: {
            enabled: true,
            probability: 10,
            status: 503,
            message: "Service temporarily unavailable"
        }
    },

    // Endpoint with delay simulation
    {
        path: "/api/slow-operation",
        method: "POST",
        response: {
            success: true,
            processingTime: "{{faker.number.int({ min: 1000, max: 5000 })}}",
            result: "Operation completed"
        },
        persist: false,
        statusCode: 200,
        delay: 2000
    },

    // Search endpoint with query parameters
    {
        path: "/api/search",
        method: "GET",
        response: {
            results: [{
                id: "{{faker.string.uuid}}",
                title: "{{faker.lorem.sentence}}",
                description: "{{faker.lorem.paragraph}}",
                category: "{{faker.helpers.arrayElement(['article', 'product', 'user'])}}"
            }],
            metadata: {
                total: "{{faker.number.int({ min: 1, max: 100 })}}",
                page: 1,
                perPage: 10
            }
        },
        persist: false,
        statusCode: 200
    }
];