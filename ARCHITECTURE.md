# System Architecture Documentation

## Overview

This document provides comprehensive architecture diagrams for joshburt.com.au, showing system components, data flow, and infrastructure.

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser]
        Mobile[Mobile Browser]
    end
    
    subgraph "CDN Layer"
        Netlify[Netlify CDN]
    end
    
    subgraph "Application Layer"
        Static[Static HTML/CSS/JS]
        Functions[Netlify Functions]
    end
    
    subgraph "Data Layer"
        DB[(PostgreSQL<br/>Neon)]
        Cache[(In-Memory<br/>Cache)]
    end
    
    subgraph "External Services"
        Sentry[Error Tracking<br/>Sentry]
        Auth0[OAuth Provider<br/>Auth0]
        Email[Email Service<br/>SMTP]
    end
    
    Browser --> Netlify
    Mobile --> Netlify
    Netlify --> Static
    Netlify --> Functions
    Functions --> DB
    Functions --> Cache
    Functions --> Sentry
    Functions --> Auth0
    Functions --> Email
    
    style Browser fill:#3b82f6
    style Mobile fill:#3b82f6
    style Netlify fill:#10b981
    style Functions fill:#f59e0b
    style DB fill:#8b5cf6
```

## Component Architecture

```mermaid
graph LR
    subgraph "Frontend"
        UI[HTML Pages]
        Nav[Navigation Component]
        Theme[Theme Manager]
        Forms[Form Components]
    end
    
    subgraph "API Functions"
        Auth[auth.js]
        Users[users.js]
        Products[products.js]
        Orders[orders.js]
        Audit[audit-logs.js]
    end
    
    subgraph "Core Modules"
        DB[database.js]
        JWT[jwt-utils.js]
        RBAC[rbac.js]
        Logger[logger.js]
    end
    
    UI --> Auth
    UI --> Users
    UI --> Products
    UI --> Orders
    
    Auth --> DB
    Users --> DB
    Products --> DB
    Orders --> DB
    
    Auth --> JWT
    Users --> RBAC
    Products --> RBAC
    Orders --> RBAC
    
    Auth --> Logger
    Users --> Logger
    Products --> Logger
    Orders --> Logger
    
    Logger --> Audit
    Audit --> DB
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant Auth Function
    participant Database
    participant JWT Utils
    
    User->>Browser: Enter credentials
    Browser->>Auth Function: POST /auth?action=login
    Auth Function->>Database: Query user by email
    Database-->>Auth Function: User data
    Auth Function->>Auth Function: Verify password (bcrypt)
    
    alt Password valid
        Auth Function->>JWT Utils: Generate tokens
        JWT Utils-->>Auth Function: Access + Refresh tokens
        Auth Function->>Database: Store refresh token
        Auth Function-->>Browser: 200 OK + tokens
        Browser->>Browser: Store tokens
        Browser-->>User: Redirect to dashboard
    else Password invalid
        Auth Function-->>Browser: 401 Unauthorized
        Browser-->>User: Show error message
    end
```

## OAuth Flow (Auth0)

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant Auth Function
    participant Auth0
    participant Database
    
    User->>Browser: Click "Login with Auth0"
    Browser->>Auth0: Redirect to Auth0 login
    Auth0->>User: Show login page
    User->>Auth0: Enter credentials
    Auth0->>Auth0: Verify credentials
    
    Auth0-->>Browser: Redirect with code
    Browser->>Auth Function: POST /auth?action=oauth-callback
    Auth Function->>Auth0: Exchange code for token
    Auth0-->>Auth Function: ID token + Access token
    Auth Function->>Auth Function: Verify JWT signature
    Auth Function->>Database: Find/create user
    Auth Function->>JWT Utils: Generate app tokens
    Auth Function-->>Browser: 200 OK + tokens
    Browser-->>User: Redirect to dashboard
```

## Order Processing Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant Products API
    participant Orders API
    participant Database
    participant Audit
    participant Email
    
    User->>Browser: Browse products
    Browser->>Products API: GET /products
    Products API->>Database: Query products
    Database-->>Products API: Product list
    Products API-->>Browser: Return products
    
    User->>Browser: Add to cart & checkout
    Browser->>Orders API: POST /orders
    Orders API->>Database: Begin transaction
    Orders API->>Database: Create order record
    Orders API->>Database: Create order items
    Orders API->>Database: Update inventory
    
    alt Transaction successful
        Orders API->>Database: Commit transaction
        Orders API->>Audit: Log order creation
        Orders API->>Email: Send confirmation
        Orders API-->>Browser: 201 Created
        Browser-->>User: Show success message
    else Transaction failed
        Orders API->>Database: Rollback transaction
        Orders API->>Audit: Log error
        Orders API-->>Browser: 500 Error
        Browser-->>User: Show error message
    end
```

## Data Flow Diagram

```mermaid
graph LR
    subgraph "User Actions"
        Login[Login]
        Browse[Browse Products]
        Order[Place Order]
        Admin[Admin Actions]
    end
    
    subgraph "API Layer"
        AuthAPI[Auth API]
        ProductsAPI[Products API]
        OrdersAPI[Orders API]
        UsersAPI[Users API]
    end
    
    subgraph "Business Logic"
        Validate[Validation]
        Auth[Authorization]
        Process[Processing]
    end
    
    subgraph "Data Storage"
        DB[(Database)]
        Audit[(Audit Logs)]
    end
    
    Login --> AuthAPI
    Browse --> ProductsAPI
    Order --> OrdersAPI
    Admin --> UsersAPI
    
    AuthAPI --> Validate
    ProductsAPI --> Validate
    OrdersAPI --> Validate
    UsersAPI --> Validate
    
    Validate --> Auth
    Auth --> Process
    
    Process --> DB
    Process --> Audit
    
    DB --> ProductsAPI
    DB --> OrdersAPI
    DB --> UsersAPI
```

## Database Schema

```mermaid
erDiagram
    USERS ||--o{ ORDERS : places
    USERS ||--o{ AUDIT_LOGS : generates
    USERS ||--o{ REFRESH_TOKENS : has
    ORDERS ||--|{ ORDER_ITEMS : contains
    PRODUCTS ||--o{ ORDER_ITEMS : "ordered in"
    USERS {
        int id PK
        string email UK
        string password
        string name
        string role
        boolean is_active
        timestamp created_at
    }
    ORDERS {
        int id PK
        string order_number UK
        int created_by FK
        decimal total_amount
        string status
        timestamp created_at
    }
    ORDER_ITEMS {
        int id PK
        int order_id FK
        int product_id FK
        int quantity
        decimal unit_price
        decimal subtotal
    }
    PRODUCTS {
        int id PK
        string code UK
        string name
        string type
        decimal price
        boolean in_stock
        int stock_quantity
    }
    AUDIT_LOGS {
        int id PK
        int user_id FK
        string action
        string details
        timestamp created_at
    }
    REFRESH_TOKENS {
        int id PK
        int user_id FK
        string token_hash
        timestamp expires_at
    }
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development"
        DevLocal[Local Development<br/>SQLite]
        DevTests[Automated Tests<br/>CI Pipeline]
    end
    
    subgraph "Staging"
        StagingNetlify[Netlify Staging]
        StagingDB[(Staging PostgreSQL)]
    end
    
    subgraph "Production"
        ProdNetlify[Netlify Production]
        ProdDB[(Production PostgreSQL)]
        ProdCDN[Global CDN]
    end
    
    subgraph "Monitoring"
        Logs[Log Aggregation]
        Errors[Error Tracking]
        Metrics[Performance Metrics]
        Alerts[Alerting System]
    end
    
    DevLocal --> DevTests
    DevTests -->|Merge to staging| StagingNetlify
    StagingNetlify --> StagingDB
    StagingNetlify -->|Approved| ProdNetlify
    ProdNetlify --> ProdDB
    ProdNetlify --> ProdCDN
    
    ProdNetlify --> Logs
    ProdNetlify --> Errors
    ProdNetlify --> Metrics
    Metrics --> Alerts
    
    style ProdNetlify fill:#10b981
    style ProdDB fill:#8b5cf6
    style Alerts fill:#ef4444
```

## Security Architecture

```mermaid
graph TB
    subgraph "Request Flow"
        Client[Client Request]
        CDN[CDN Layer]
        WAF[Web Application Firewall]
        Function[Netlify Function]
    end
    
    subgraph "Authentication"
        JWT[JWT Verification]
        RBAC[Role-Based Access Control]
        RateLimit[Rate Limiting]
    end
    
    subgraph "Data Security"
        Encryption[Data Encryption]
        Hashing[Password Hashing<br/>bcrypt]
        Sanitization[Input Sanitization]
    end
    
    subgraph "Audit"
        Logging[Audit Logging]
        Monitoring[Security Monitoring]
    end
    
    Client --> CDN
    CDN --> WAF
    WAF --> Function
    Function --> JWT
    JWT --> RBAC
    RBAC --> RateLimit
    RateLimit --> Sanitization
    Sanitization --> Hashing
    Hashing --> Encryption
    
    Function --> Logging
    Logging --> Monitoring
    
    style WAF fill:#ef4444
    style JWT fill:#f59e0b
    style Encryption fill:#10b981
```

## Monitoring Architecture

```mermaid
graph LR
    subgraph "Data Collection"
        App[Application]
        Functions[Netlify Functions]
        DB[(Database)]
    end
    
    subgraph "Aggregation"
        Logs[Log Aggregation]
        Metrics[Metrics Collection]
        Traces[Distributed Tracing]
    end
    
    subgraph "Analysis"
        Dashboard[Monitoring Dashboard]
        Alerts[Alert Manager]
        Reports[Performance Reports]
    end
    
    subgraph "Action"
        Notifications[Notifications]
        OnCall[On-Call System]
        Automation[Auto-Remediation]
    end
    
    App --> Logs
    Functions --> Logs
    DB --> Metrics
    
    Logs --> Dashboard
    Metrics --> Dashboard
    Traces --> Dashboard
    
    Dashboard --> Alerts
    Dashboard --> Reports
    
    Alerts --> Notifications
    Alerts --> OnCall
    Alerts --> Automation
```

## Scalability Considerations

### Current Architecture
- **Static Assets**: Served via Netlify CDN (global distribution)
- **Functions**: Auto-scaling serverless (concurrent execution)
- **Database**: Managed PostgreSQL with connection pooling
- **Caching**: In-memory caching within functions

### Scaling Strategies

1. **Horizontal Scaling**
   - Functions auto-scale with demand
   - Database connection pooling prevents bottlenecks

2. **Vertical Scaling**
   - Increase function memory/timeout limits
   - Upgrade database tier as needed

3. **Caching**
   - Implement Redis for distributed caching
   - Cache frequently accessed data (products, settings)

4. **Database Optimization**
   - Add read replicas for heavy read operations
   - Implement database sharding if needed
   - Use materialized views for complex queries

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | HTML5, CSS3, JavaScript | User interface |
| Styling | TailwindCSS v4 | Responsive design |
| Backend | Node.js | Serverless functions |
| Functions | Netlify Functions | API endpoints |
| Database | PostgreSQL (Neon) | Data persistence |
| Authentication | JWT, bcrypt | Security |
| OAuth | Auth0 | Third-party auth |
| Monitoring | Sentry | Error tracking |
| Deployment | Netlify, GitHub Actions | CI/CD |
| Version Control | Git, GitHub | Source control |

## Performance Characteristics

### Response Times (Target SLAs)
- **P50**: < 200ms
- **P95**: < 1000ms
- **P99**: < 3000ms

### Availability
- **Target**: 99.9% uptime
- **Downtime allowance**: ~43 minutes/month

### Throughput
- **Functions**: Auto-scaling, no hard limit
- **Database**: ~1000 concurrent connections
- **CDN**: Unlimited (Netlify CDN)

## Disaster Recovery

### Backup Strategy
- **Database**: Daily automated backups (Neon)
- **Code**: Version controlled in Git
- **Configuration**: Environment variables backed up securely

### Recovery Procedures
1. **Code Rollback**: Netlify deploy history (instant)
2. **Database Recovery**: Restore from backup (~15 minutes)
3. **Configuration**: Re-apply from backup

### RPO/RTO
- **RPO** (Recovery Point Objective): 24 hours
- **RTO** (Recovery Time Objective): 15 minutes

## Resources

- [Netlify Architecture](https://www.netlify.com/products/edge/)
- [Neon Database Architecture](https://neon.tech/docs/introduction/architecture-overview)
- [Serverless Architecture Patterns](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html)
