#!/bin/bash
# Audit conventional commits adoption
# Usage: bash scripts/audit-conventional-commits.sh [num-commits]
# Default: last 20 commits

LIMIT=${1:-20}

echo "═══════════════════════════════════════════════════════════════════════════════"
echo "CONVENTIONAL COMMITS AUDIT (Last $LIMIT commits)"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""

# Get commit data
TOTAL=$(git log --oneline -$LIMIT | wc -l)
COMPLIANT=$(git log --oneline -$LIMIT | grep -E "^[a-f0-9]+ (feat|fix|test|docs|refactor|chore|ci|style|perf)\(" | wc -l)
MERGES=$(git log --oneline -$LIMIT | grep "^[a-f0-9]+ Merge" | wc -l)
UPPERCASE=$(git log --oneline -$LIMIT | grep -E "^[a-f0-9]+ (TEST|FEAT|FIX|DOCS):" | wc -l)

# Calculate percentages
PERCENT=$((COMPLIANT * 100 / TOTAL))
MERGE_PERCENT=$((MERGES * 100 / TOTAL))

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "SUMMARY:"
echo "  Total commits: $TOTAL"
echo "  Compliant (type(scope):): $COMPLIANT ($PERCENT%)"
echo "  Merges (expected): $MERGES ($MERGE_PERCENT%)"
echo "  Uppercase legacy (TEST:/FEAT:): $UPPERCASE"
echo ""

# Determine status
if [ $PERCENT -ge 80 ]; then
  STATUS="${GREEN}✅ EXCELLENT${NC} (80%+ adoption)"
elif [ $PERCENT -ge 50 ]; then
  STATUS="${YELLOW}⚠️  GOOD PROGRESS${NC} (50-79% adoption)"
elif [ $PERCENT -ge 20 ]; then
  STATUS="${YELLOW}⚠️  RAMP-UP${NC} (20-49% adoption - expected week 1)"
else
  STATUS="${RED}❌ LOW ADOPTION${NC} (<20% - check AI instructions)"
fi

echo "STATUS: $STATUS"
echo ""

# Detailed breakdown
echo "DETAILED BREAKDOWN:"
echo ""

git log --oneline -$LIMIT | while read hash msg; do
  if [[ $msg =~ ^(feat|fix|test|docs|refactor|chore|ci|style|perf)\( ]]; then
    echo -e "${GREEN}✅${NC} $hash $msg"
  elif [[ $msg =~ ^(Merge|revert|Revert) ]]; then
    echo -e "⊘  $hash $msg"
  elif [[ $msg =~ ^(TEST|FEAT|FIX|DOCS): ]]; then
    echo -e "${YELLOW}⚠️${NC}  $hash $msg (legacy uppercase format)"
  else
    echo -e "${RED}❌${NC} $hash $msg"
  fi
done

echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"

# Check for TDD pattern
echo ""
echo "TDD PATTERN CHECK:"
echo ""

TEST_COMMITS=$(git log --oneline -$LIMIT | grep -E "^[a-f0-9]+ (test|TEST)" | wc -l)
FEAT_COMMITS=$(git log --oneline -$LIMIT | grep -E "^[a-f0-9]+ (feat|FEAT)" | wc -l)

echo "  test() commits: $TEST_COMMITS"
echo "  feat() commits: $FEAT_COMMITS"

if [ $TEST_COMMITS -gt 0 ]; then
  echo "  Status: ✅ TDD evidence visible"
else
  echo "  Status: ⚠️  No test commits visible (may be testing externally)"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "NOTES:"
echo "  • Baseline (2025-11-07): 23% (7/30 commits)"
echo "  • Expected Week 1: 50-70%"
echo "  • Expected Week 2+: 80%+"
echo "  • Uppercase (TEST:/FEAT:) should decline toward 0%"
echo ""
echo "See .coord/test-context/BASELINE-CONVENTIONAL-COMMITS-20251107.md for details"
echo "═══════════════════════════════════════════════════════════════════════════════"
