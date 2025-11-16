# c3-bff

> Backend-for-frontend API for C3

## Installation

```bash
npm install
```

## Development

```bash
# Start server
npm run dev

# Build
npm run build

# Production
npm start
```

API runs on **http://localhost:3001**

---

## API Endpoints

### Health Check
```bash
GET /health
```

### Module Analysis

#### Analyze Codebase
```bash
POST /api/projections/modules/analyze
Content-Type: application/json

{
  "rootPath": "/absolute/path/to/src",
  "config": {
    "aggregationLevel": "top-level",
    "includeTests": false,
    "excludePatterns": ["node_modules", "dist", "tests"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "analysisId": "analysis-1234567890",
    "summary": {
      "totalModules": 12,
      "totalFiles": 36,
      "totalDependencies": 19,
      "averageCoupling": 1.58,
      "circularDependencies": 0,
      "architectureScore": 100
    },
    "modules": [...],
    "dependencies": [...],
    "hotspots": [...],
    "recommendations": [...]
  }
}
```

#### Get Analysis
```bash
GET /api/projections/modules/:analysisId
```

#### Export Analysis
```bash
# JSON format
GET /api/projections/modules/:analysisId/export?format=json

# GraphML format (for yEd, Gephi)
GET /api/projections/modules/:analysisId/export?format=graphml

# SVG visualization
GET /api/projections/modules/:analysisId/export?format=svg&colorScheme=dependencies

# Markdown report
GET /api/projections/modules/:analysisId/export?format=markdown
```

#### Validate Architecture
```bash
POST /api/projections/modules/validate
Content-Type: application/json

{
  "rootPath": "/absolute/path/to/src",
  "config": {
    "aggregationLevel": "top-level",
    "layers": {
      "domain": ["domain"],
      "application": ["application"],
      "infrastructure": ["infrastructure"]
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "validationId": "validation-123",
    "score": 100,
    "grade": "A+",
    "checks": {
      "domainIndependence": { "passed": true },
      "circularDependencies": { "passed": true }
    }
  }
}
```

#### List Analyses
```bash
GET /api/projections/modules?limit=50&offset=0&sort=createdAt&order=desc
```

#### Delete Analysis
```bash
DELETE /api/projections/modules/:analysisId
```

---

## Testing

### Manual Testing
```bash
# Start the server
npm run dev

# In another terminal, run the test script
./test-api.sh
```

### Example cURL Commands

```bash
# Analyze c3-projection itself
curl -X POST http://localhost:3001/api/projections/modules/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "rootPath": "/Users/samuelgleeson/dev/c3-projection/src",
    "config": {
      "aggregationLevel": "top-level",
      "includeTests": false
    }
  }'

# Get analysis (replace with actual ID)
curl http://localhost:3001/api/projections/modules/analysis-1234567890

# Export as SVG
curl "http://localhost:3001/api/projections/modules/analysis-1234567890/export?format=svg" \
  | jq -r '.data.content' > module-graph.svg
```

---

## Architecture

```
c3-bff (Express API)
  ↓
c3-wiring (DI Container)
  ↓
c3-projection + c3-parsing
```

### Dependencies

- **c3-parsing** v2.0.0 - TypeScript parsing with extensions
- **c3-projection** v0.1.0 - Module analysis and visualization
- **c3-wiring** v0.1.0 - Dependency injection
- **c3-shared** v0.1.0 - Utilities

---

## Features

✅ **Parse TypeScript/JavaScript codebases**  
✅ **Module-level dependency analysis**  
✅ **Multiple aggregation levels** (directory, top-level, package)  
✅ **Export to multiple formats** (JSON, GraphML, SVG, Markdown)  
✅ **Clean Architecture validation**  
✅ **Circular dependency detection**  
✅ **Architecture health scoring**  
✅ **Hotspot identification**  
✅ **Coupling metrics**  

---

## Environment Variables

```env
PORT=3001
HOST=localhost
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

---

## Part of C3

[c3-platform](https://github.com/garrick0/c3-platform)

---

## Documentation

- [API Integration Plan](/Users/samuelgleeson/dev/c3-platform/docs/API-INTEGRATION-PLAN.md)
- [Module Dependency View Design](/Users/samuelgleeson/dev/c3-projection/docs/module-dependency-view-design.md)

---

## License

MIT
