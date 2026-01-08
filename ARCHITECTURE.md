# Invoice-Me Architecture

This document describes the refactored MVC architecture of the Invoice-Me application.

## Directory Structure

```
invoice-me/
├── server.js                    # Main application entry point
├── src/
│   ├── config/                  # Configuration files
│   │   └── environment.js       # Environment variables and app config
│   ├── controllers/             # Request handlers (business logic)
│   │   ├── authController.js    # OAuth authentication logic
│   │   ├── customerController.js # Customer CRUD operations
│   │   ├── itemController.js    # Item/Product CRUD operations
│   │   └── invoiceController.js # Invoice CRUD operations
│   ├── models/                  # Data models (QuickBooks entities)
│   │   ├── Customer.js          # Customer model with QB API methods
│   │   ├── Item.js              # Item model with QB API methods
│   │   └── Invoice.js           # Invoice model with QB API methods
│   ├── routes/                  # API route definitions
│   │   ├── authRoutes.js        # /auth/* routes
│   │   ├── customerRoutes.js    # /customers/* routes
│   │   ├── itemRoutes.js        # /items/* routes
│   │   └── invoiceRoutes.js     # /invoices/* and /api/* routes
│   ├── middleware/              # Express middleware
│   │   └── cors.js              # CORS configuration
│   └── utils/                   # Utility functions and helpers
│       ├── quickbooksClient.js  # QuickBooks API client wrapper
│       └── responseHandler.js   # Standardized API response handling
└── public/                      # Frontend static files
```

## Architecture Layers

### 1. **Configuration Layer** (`src/config/`)
- **Purpose**: Centralized configuration management
- **Files**:
  - `environment.js`: All environment variables, API URLs, and app settings
- **Benefits**: Single source of truth for configuration

### 2. **Utility Layer** (`src/utils/`)
- **Purpose**: Reusable helper functions and clients
- **Files**:
  - `quickbooksClient.js`: Singleton client for QuickBooks API interactions
    - Methods: `get()`, `post()`, `query()`, `exchangeCodeForToken()`
    - Manages access tokens and company ID
  - `responseHandler.js`: Standardized response formatting
    - Methods: `success()`, `error()`, `notAuthenticated()`, `badRequest()`, `notFound()`

### 3. **Model Layer** (`src/models/`)
- **Purpose**: Data access and business logic for QuickBooks entities
- **Files**:
  - `Customer.js`: Customer operations
    - `getAll()`, `getById()`, `create()`, `update()`, `createBulk()`
  - `Item.js`: Item/Product operations
    - `getAll()`, `getById()`, `create()`
  - `Invoice.js`: Invoice operations
    - `getAll()`, `getById()`, `getByDocNumber()`, `create()`, `update()`
    - `updateLine()`, `deleteLine()`, `delete()`

### 4. **Controller Layer** (`src/controllers/`)
- **Purpose**: Handle HTTP requests and responses
- **Files**:
  - `authController.js`: OAuth flow handling
  - `customerController.js`: Customer endpoint logic
  - `itemController.js`: Item endpoint logic
  - `invoiceController.js`: Invoice endpoint logic
- **Responsibilities**:
  - Validate request data
  - Call appropriate model methods
  - Format responses using ResponseHandler
  - Handle errors gracefully

### 5. **Route Layer** (`src/routes/`)
- **Purpose**: Define API endpoints and map to controllers
- **Files**:
  - `authRoutes.js`: Authentication routes
  - `customerRoutes.js`: Customer CRUD routes
  - `itemRoutes.js`: Item CRUD routes
  - `invoiceRoutes.js`: Invoice CRUD routes

### 6. **Middleware Layer** (`src/middleware/`)
- **Purpose**: Request/response processing
- **Files**:
  - `cors.js`: CORS policy for frontend communication

### 7. **Application Entry Point** (`server.js`)
- **Purpose**: Bootstrap the application
- **Responsibilities**:
  - Initialize Express app
  - Register middleware
  - Mount route handlers
  - Start HTTP server

## Request Flow

```
1. Client Request
   ↓
2. server.js (Express app)
   ↓
3. Middleware (CORS, body-parser)
   ↓
4. Routes (map URL to controller)
   ↓
5. Controller (validate, orchestrate)
   ↓
6. Model (QuickBooks API interaction)
   ↓
7. QuickBooksClient (HTTP client)
   ↓
8. QuickBooks API
   ↓
9. Response flows back through layers
   ↓
10. ResponseHandler formats response
   ↓
11. Client receives JSON response
```

## Key Design Patterns

### 1. **Singleton Pattern**
- `quickbooksClient` is a singleton to maintain single access token across requests

### 2. **MVC Pattern**
- **Model**: Data and business logic
- **View**: Frontend (React components)
- **Controller**: Request/response handling

### 3. **Dependency Injection**
- Controllers depend on models
- Models depend on quickbooksClient
- Easy to test and modify

### 4. **Repository Pattern**
- Models act as repositories for QuickBooks entities
- Encapsulate all QB API interactions

## API Endpoints

### Authentication
- `GET /auth/callback` - OAuth callback handler

### Customers
- `GET /customers` - Get all customers
- `POST /customers/create` - Create single customer
- `POST /customers/bulk` - Create multiple customers
- `POST /customers/test` - Test customer creation
- `PUT /customers/:id` - Update customer

### Items
- `GET /items` - Get all items
- `POST /create-item` - Create new item

### Invoices
- `GET /invoices` - Get all invoices with customer names
- `POST /create-invoice` - Create new invoice
- `PUT /api/update-invoice-line` - Update invoice line item
- `PUT /api/delete-invoice-line` - Delete invoice line item
- `DELETE /api/invoice/:invoiceId` - Delete invoice (returns error due to QB API limitation)

## Benefits of This Architecture

1. **Separation of Concerns**: Each layer has a specific responsibility
2. **Maintainability**: Easy to locate and modify code
3. **Testability**: Each layer can be tested independently
4. **Scalability**: Easy to add new features or endpoints
5. **Reusability**: Utility functions and models can be reused
6. **Error Handling**: Centralized error handling in ResponseHandler
7. **Code Organization**: Clear structure makes onboarding easier

## QuickBooks API Limitations

The application properly handles these QuickBooks API constraints:
- Invoices cannot be deleted (only voided manually in QuickBooks UI)
- Proper error messages inform users of API limitations
- All errors are logged for debugging

## Future Enhancements

Potential improvements to consider:
- Add service layer between controllers and models
- Implement caching for frequently accessed data
- Add request validation middleware
- Implement rate limiting
- Add comprehensive logging system
- Implement refresh token handling
- Add unit and integration tests
- Add API documentation (Swagger/OpenAPI)
