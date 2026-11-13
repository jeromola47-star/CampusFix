// OpenAPI 3 specification served by Swagger UI at /api/docs
const bearer = [{ bearerAuth: [] }];
const str = { type: 'string' };
const int = { type: 'integer' };
const idParam = { name: 'id', in: 'path', required: true, schema: int };
const jsonBody = (properties, required = Object.keys(properties)) => ({
  required: true, content: { 'application/json': { schema: { type: 'object', required, properties } } },
});
const requestForm = (required) => ({
  required: true,
  content: {
    'multipart/form-data': {
      schema: {
        type: 'object', required,
        properties: {
          title: str, description: str, location: str,
          priority: { type: 'string', enum: ['Low', 'Medium', 'High'] }, categoryId: int,
          image: { type: 'string', format: 'binary', description: 'Optional JPG, PNG, WEBP or GIF up to 5 MB' },
        },
      },
    },
  },
});
const res = (codes) => Object.fromEntries(Object.entries(codes).map(([c, d]) => [c, { description: d }]));
const op = (tag, summary, extra = {}) => ({
  tags: [tag], summary, security: extra.public ? [] : bearer,
  parameters: extra.params, requestBody: extra.body,
  responses: res({ 200: 'Success', ...(extra.codes || {}), ...(extra.public ? {} : { 401: 'Missing or invalid token' }) }),
});
const q = (name, description) => ({ name, in: 'query', schema: str, description });

module.exports = {
  openapi: '3.0.3',
  info: { title: 'CampusFix API', version: '1.0.0', description: 'University maintenance and service request management API. Click Authorize and paste the token returned by /api/auth/login.' },
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
  paths: {
    '/api/auth/register': { post: op('Auth', 'Create a Student/Staff account', { public: true, codes: { 201: 'Created', 400: 'Validation failed', 409: 'Email already used' }, body: jsonBody({ name: str, email: str, password: str }) }) },
    '/api/auth/login': { post: op('Auth', 'Log in and receive a JWT', { public: true, codes: { 401: 'Invalid credentials' }, body: jsonBody({ email: str, password: str }) }) },
    '/api/auth/me': { get: op('Auth', 'Get the current user') },
    '/api/categories': { get: op('Requests', 'List request categories') },
    '/api/requests': {
      post: op('Requests', 'Submit a service request (Student/Staff, Admin)', { body: requestForm(['title', 'description', 'location', 'priority', 'categoryId']), codes: { 201: 'Created', 400: 'Validation failed', 403: 'Forbidden' } }),
      get: op('Requests', 'List requests with search, filters and pagination (scoped by role)', {
        params: [q('page', 'Page number'), q('limit', 'Items per page'), q('search', 'Matches title, description or location'), q('status', 'Pending, Assigned, In Progress or Completed'), q('category', 'Category id'), q('priority', 'Low, Medium or High')],
      }),
    },
    '/api/requests/{id}': {
      get: op('Requests', 'Get one request with its status history', { params: [idParam], codes: { 403: 'Forbidden', 404: 'Not found' } }),
      put: op('Requests', 'Edit a request (owner while Pending, or Admin)', { params: [idParam], body: requestForm([]), codes: { 400: 'Validation failed', 403: 'Forbidden', 404: 'Not found' } }),
      delete: op('Requests', 'Delete a request (Admin)', { params: [idParam], codes: { 403: 'Forbidden', 404: 'Not found' } }),
    },
    '/api/requests/{id}/assign': { patch: op('Requests', 'Assign a request to an officer (Admin)', { params: [idParam], body: jsonBody({ officerId: int }), codes: { 400: 'Not an officer', 403: 'Forbidden', 404: 'Not found' } }) },
    '/api/requests/{id}/status': {
      patch: op('Requests', 'Update status (assigned Officer or Admin)', {
        params: [idParam], body: jsonBody({ status: { type: 'string', enum: ['Pending', 'Assigned', 'In Progress', 'Completed'] }, comment: str }, ['status']),
        codes: { 400: 'Validation failed', 403: 'Forbidden', 404: 'Not found' },
      }),
    },
    '/api/users': {
      get: op('Users', 'List all users (Admin)'),
      post: op('Users', 'Create a user with any role (Admin)', { body: jsonBody({ name: str, email: str, password: str, role: { type: 'string', enum: ['student_staff', 'officer', 'admin'] } }), codes: { 201: 'Created', 409: 'Email already used' } }),
    },
    '/api/users/officers': { get: op('Users', 'List maintenance officers (Admin)') },
    '/api/users/{id}/role': { patch: op('Users', "Change a user's role (Admin)", { params: [idParam], body: jsonBody({ role: { type: 'string', enum: ['student_staff', 'officer', 'admin'] } }) }) },
    '/api/users/{id}': { delete: op('Users', 'Delete a user (Admin)', { params: [idParam] }) },
    '/api/reports/summary': { get: op('Reports', 'Request counts by status (Admin)') },
    '/api/reports/export.csv': { get: op('Reports', 'Download all requests as CSV (Admin)') },
    '/api/reports/audit': { get: op('Reports', 'Paginated audit log (Admin)', { params: [q('page', 'Page number'), q('limit', 'Items per page')] }) },
    '/api/notifications': { get: op('Notifications', 'List my notifications and unread count') },
    '/api/notifications/read-all': { patch: op('Notifications', 'Mark all my notifications as read') },
    '/api/notifications/{id}/read': { patch: op('Notifications', 'Mark one notification as read', { params: [idParam] }) },
  },
};
