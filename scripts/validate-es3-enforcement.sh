#!/bin/bash
# ES3 Enforcement Validation Script
#
# Purpose: Prove ESLint catches ES3 violations by running intentional violation files
# Expected: Both test files MUST fail linting (proving enforcement works)
# Exit 0: Enforcement working (violations caught as expected)
# Exit 1: Enforcement broken (violations NOT caught - regression detected)

set -euo pipefail

echo "🔍 Validating ES3 enforcement..."
echo ""

# Test 1: Parser-level rejection (const, let, arrow, template literals)
echo "1️⃣  Testing parser-level rejection (jsx/test-es3-violations.jsx)..."
OUTPUT1=$(npx eslint --no-ignore jsx/test-es3-violations.jsx 2>&1 || true)
if echo "$OUTPUT1" | grep -q "Parsing error: Unexpected token"; then
  echo "   ✓ Parser correctly rejects ES6+ syntax"
else
  echo "   ✗ FAILURE: Parser did NOT reject ES6+ syntax (regression detected)"
  exit 1
fi

# Test 2: Rule-level detection (console, ==, missing braces, etc.)
echo ""
echo "2️⃣  Testing rule-level detection (jsx/test-es3-rule-violations.jsx)..."
OUTPUT2=$(npx eslint --no-ignore jsx/test-es3-rule-violations.jsx 2>&1 || true)
VIOLATIONS=$(echo "$OUTPUT2" | grep -c "error" || true)
if [ "$VIOLATIONS" -ge 10 ]; then
  echo "   ✓ ESLint rules caught $VIOLATIONS violations (expected 10+)"
else
  echo "   ✗ FAILURE: ESLint only caught $VIOLATIONS violations (expected 10+)"
  exit 1
fi

echo ""
echo "✅ ES3 enforcement validation PASSED"
echo "   - Parser rejects ES6+ syntax"
echo "   - ESLint rules catch code quality violations"
exit 0
