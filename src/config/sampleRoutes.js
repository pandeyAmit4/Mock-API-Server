// Base routes definition
export const sampleRoutes = [
    {
        path: '/api/users',
        method: 'GET',
        response: {
            users: [{
                id: '{{faker.string.uuid}}',
                name: '{{faker.person.fullName}}',
                email: '{{faker.internet.email}}',
                role: '{{faker.helpers.arrayElement(["admin", "user", "editor"])}}'
            }]
        },
        persist: true,
        statusCode: 200
    },
    {
        path: '/api/products',
        method: 'GET',
        response: {
            products: [{
                id: '{{faker.string.uuid}}',
                name: '{{faker.commerce.productName}}',
                price: '{{faker.commerce.price}}',
                description: '{{faker.commerce.productDescription}}'
            }]
        },
        persist: true,
        statusCode: 200
    },
    {
        path: '/api/blog-posts',
        method: 'GET',
        response: {
            posts: [{
                id: '{{faker.string.uuid}}',
                title: '{{faker.lorem.sentence}}',
                content: '{{faker.lorem.paragraphs}}',
                author: '{{faker.person.fullName}}',
                createdAt: '{{faker.date.past}}'
            }]
        },
        persist: true,
        statusCode: 200
    }
];

// Create CRUD operations for each resource
const resources = ['users', 'products', 'posts'];
const resourcePaths = {
    users: '/api/users',
    products: '/api/products',
    posts: '/api/blog-posts'
};

resources.forEach(resource => {
    const basePath = resourcePaths[resource];
    const baseRoute = sampleRoutes.find(r => r.path === basePath);
    const template = baseRoute.response[resource][0];

    // Add GET single item route
    sampleRoutes.push({
        path: `${basePath}/:id`,
        method: 'GET',
        response: template,
        persist: true,
        statusCode: 200
    });

    // Add POST route
    sampleRoutes.push({
        path: basePath,
        method: 'POST',
        response: template,
        persist: true,
        statusCode: 201,
        validateRequest: true
    });

    // Add PUT route
    sampleRoutes.push({
        path: `${basePath}/:id`,
        method: 'PUT',
        response: template,
        persist: true,
        statusCode: 200,
        validateRequest: true
    });

    // Add DELETE route
    sampleRoutes.push({
        path: `${basePath}/:id`,
        method: 'DELETE',
        response: null,
        persist: true,
        statusCode: 204
    });
});

export default sampleRoutes;
