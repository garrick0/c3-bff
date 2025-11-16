#!/bin/bash

# Test script for Module Analysis API
# Usage: ./test-api.sh

BASE_URL="http://localhost:3001"
API="${BASE_URL}/api"

echo "================================================="
echo "  Module Analysis API Test"
echo "================================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health check
echo "1. Testing health check..."
response=$(curl -s -w "\n%{http_code}" "${BASE_URL}/health")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✓ Health check passed${NC}"
  echo "   Response: $body"
else
  echo -e "${RED}✗ Health check failed (HTTP $http_code)${NC}"
  exit 1
fi
echo ""

# Test 2: Analyze modules
echo "2. Testing module analysis..."
echo "   Analyzing c3-projection/src..."

analysis_response=$(curl -s -w "\n%{http_code}" -X POST \
  "${API}/projections/modules/analyze" \
  -H "Content-Type: application/json" \
  -d "{
    \"rootPath\": \"$(pwd)/../c3-projection/src\",
    \"config\": {
      \"aggregationLevel\": \"top-level\",
      \"includeTests\": false,
      \"excludePatterns\": [\"node_modules\", \"dist\", \"tests\"]
    }
  }")

http_code=$(echo "$analysis_response" | tail -n1)
body=$(echo "$analysis_response" | head -n-1)

if [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✓ Analysis succeeded${NC}"
  
  # Extract analysis ID
  ANALYSIS_ID=$(echo "$body" | grep -o '"analysisId":"[^"]*"' | cut -d'"' -f4)
  echo "   Analysis ID: $ANALYSIS_ID"
  
  # Show summary
  echo "$body" | python3 -m json.tool | grep -A 10 '"summary":'
else
  echo -e "${RED}✗ Analysis failed (HTTP $http_code)${NC}"
  echo "   Response: $body"
  exit 1
fi
echo ""

# Test 3: Get analysis
if [ -n "$ANALYSIS_ID" ]; then
  echo "3. Testing get analysis..."
  get_response=$(curl -s -w "\n%{http_code}" \
    "${API}/projections/modules/${ANALYSIS_ID}")
  
  http_code=$(echo "$get_response" | tail -n1)
  
  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ Get analysis succeeded${NC}"
  else
    echo -e "${RED}✗ Get analysis failed (HTTP $http_code)${NC}"
  fi
  echo ""
  
  # Test 4: Export as JSON
  echo "4. Testing JSON export..."
  export_response=$(curl -s -w "\n%{http_code}" \
    "${API}/projections/modules/${ANALYSIS_ID}/export?format=json")
  
  http_code=$(echo "$export_response" | tail -n1)
  
  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ JSON export succeeded${NC}"
  else
    echo -e "${RED}✗ JSON export failed (HTTP $http_code)${NC}"
  fi
  echo ""
  
  # Test 5: Export as SVG
  echo "5. Testing SVG export..."
  svg_response=$(curl -s -w "\n%{http_code}" \
    "${API}/projections/modules/${ANALYSIS_ID}/export?format=svg&colorScheme=dependencies")
  
  http_code=$(echo "$svg_response" | tail -n1)
  
  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ SVG export succeeded${NC}"
  else
    echo -e "${RED}✗ SVG export failed (HTTP $http_code)${NC}"
  fi
  echo ""
  
  # Test 6: Export as GraphML
  echo "6. Testing GraphML export..."
  graphml_response=$(curl -s -w "\n%{http_code}" \
    "${API}/projections/modules/${ANALYSIS_ID}/export?format=graphml")
  
  http_code=$(echo "$graphml_response" | tail -n1)
  
  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ GraphML export succeeded${NC}"
  else
    echo -e "${RED}✗ GraphML export failed (HTTP $http_code)${NC}"
  fi
  echo ""
  
  # Test 7: Export as Markdown
  echo "7. Testing Markdown export..."
  md_response=$(curl -s -w "\n%{http_code}" \
    "${API}/projections/modules/${ANALYSIS_ID}/export?format=markdown")
  
  http_code=$(echo "$md_response" | tail -n1)
  
  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ Markdown export succeeded${NC}"
  else
    echo -e "${RED}✗ Markdown export failed (HTTP $http_code)${NC}"
  fi
  echo ""
  
  # Test 8: List analyses
  echo "8. Testing list analyses..."
  list_response=$(curl -s -w "\n%{http_code}" \
    "${API}/projections/modules?limit=10")
  
  http_code=$(echo "$list_response" | tail -n1)
  body=$(echo "$list_response" | head -n-1)
  
  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ List analyses succeeded${NC}"
    count=$(echo "$body" | grep -o '"analyses":\[' | wc -l)
    echo "   Found cached analyses"
  else
    echo -e "${RED}✗ List analyses failed (HTTP $http_code)${NC}"
  fi
  echo ""
  
  # Test 9: Delete analysis
  echo "9. Testing delete analysis..."
  delete_response=$(curl -s -w "\n%{http_code}" -X DELETE \
    "${API}/projections/modules/${ANALYSIS_ID}")
  
  http_code=$(echo "$delete_response" | tail -n1)
  
  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ Delete analysis succeeded${NC}"
  else
    echo -e "${RED}✗ Delete analysis failed (HTTP $http_code)${NC}"
  fi
  echo ""
fi

# Test 10: Validate architecture
echo "10. Testing architecture validation..."
validate_response=$(curl -s -w "\n%{http_code}" -X POST \
  "${API}/projections/modules/validate" \
  -H "Content-Type: application/json" \
  -d "{
    \"rootPath\": \"$(pwd)/../c3-projection/src\",
    \"config\": {
      \"aggregationLevel\": \"top-level\",
      \"layers\": {
        \"domain\": [\"domain\"],
        \"application\": [\"application\"],
        \"infrastructure\": [\"infrastructure\"]
      }
    }
  }")

http_code=$(echo "$validate_response" | tail -n1)
body=$(echo "$validate_response" | head -n-1)

if [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✓ Architecture validation succeeded${NC}"
  
  # Show score
  echo "$body" | python3 -m json.tool | grep -E '"score":|"grade":'
else
  echo -e "${RED}✗ Architecture validation failed (HTTP $http_code)${NC}"
  echo "   Response: $body"
fi
echo ""

echo "================================================="
echo "  Test Summary"
echo "================================================="
echo -e "${GREEN}All tests completed!${NC}"
echo ""
echo "API is ready for use at ${BASE_URL}"
echo ""

