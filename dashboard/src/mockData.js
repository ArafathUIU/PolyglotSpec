export const initialServices = [
  {
    id: "laravel-api",
    name: "Laravel Core API",
    type: "consumer",
    framework: "PHP / Laravel",
    status: "drifted",
    lastChecked: "2 minutes ago",
    activeIssues: 2,
    syncScore: 82,
    filePath: "app/Http/Requests/StoreUserRequest.php",
    schemaKey: "StoreUserRequest"
  },
  {
    id: "fastapi-service",
    name: "FastAPI AI Microservice",
    type: "provider",
    framework: "Python / FastAPI",
    status: "synced",
    lastChecked: "5 minutes ago",
    activeIssues: 0,
    syncScore: 100,
    filePath: "app/models/user.py",
    schemaKey: "UserModel"
  },
  {
    id: "node-gateway",
    name: "Express API Gateway",
    type: "consumer",
    framework: "TypeScript / Node.js (Zod)",
    status: "synced",
    lastChecked: "12 minutes ago",
    activeIssues: 0,
    syncScore: 100,
    filePath: "src/schemas/user.ts",
    schemaKey: "UserSchema"
  }
];

export const driftHistory = [
  {
    id: "dh-1",
    service: "Laravel Core API",
    commit: "d4b8b45",
    author: "Arafath Akash",
    message: "Add support for user profiles and age validation",
    severity: "breaking",
    timestamp: "10 mins ago",
    details: "Field 'age' was changed from nullable to required."
  },
  {
    id: "dh-2",
    service: "Express API Gateway",
    commit: "9f774cd",
    author: "Sarah Connor",
    message: "Update session token validations",
    severity: "warning",
    timestamp: "2 hours ago",
    details: "Field 'bio' character max length was updated."
  },
  {
    id: "dh-3",
    service: "FastAPI AI Microservice",
    commit: "cf7515e",
    author: "John Doe",
    message: "Tighten models input ranges",
    severity: "breaking",
    timestamp: "Yesterday",
    details: "ge constraint on 'age' increased from 16 to 18."
  }
];

export const sampleSchemas = {
  python: {
    "UserModel": {
      "fields": {
        "username": {
          "type": "string",
          "required": true,
          "nullable": false,
          "min_length": 3,
          "max_length": 20
        },
        "email": {
          "type": "string",
          "required": true,
          "nullable": false
        },
        "age": {
          "type": "integer",
          "required": false,
          "nullable": false,
          "ge": 18,
          "default": 18
        }
      },
      "raw_class": "UserModel"
    }
  },
  laravel: {
    "StoreUserRequest": {
      "fields": {
        "username": {
          "type": "string",
          "required": true,
          "nullable": false,
          "min": 2, // Drift: consumer sends min 2, but provider expects min 3 (breaking!)
          "max": 30  // Drift: consumer allows max 30, but provider expects max 20 (breaking!)
        },
        "email": {
          "type": "string",
          "required": true,
          "nullable": false
        },
        "age": {
          "type": "integer",
          "required": true, // Drift: consumer makes age required, but provider defaults to 18 (warning/non-breaking)
          "nullable": false,
          "min": 10 // Drift: consumer sends min 10, but provider expects min 18 (breaking!)
        }
      },
      "raw_class": "StoreUserRequest"
    }
  },
  typescript: {
    "UserSchema": {
      "fields": {
        "username": {
          "type": "string",
          "required": true,
          "nullable": false,
          "min": 3,
          "max": 20
        },
        "email": {
          "type": "string",
          "required": true,
          "nullable": false,
          "format": "email"
        },
        "age": {
          "type": "number",
          "required": false,
          "nullable": false,
          "min": 18,
          "default": 18
        }
      },
      "raw_class": "UserSchema"
    }
  }
};
