/**
 * ES3 RULE VIOLATION TEST FILE
 *
 * Purpose: Validate ESLint rule-level enforcement (not parser-level)
 * Expected: This file should pass PARSING but FAIL linting with rule violations
 *
 * This file uses ES3-valid syntax but violates code quality rules
 *
 * DO NOT USE THIS CODE IN PRODUCTION - FOR TESTING ONLY
 */

// VIOLATION 1: console.log (forbidden in ExtendScript - no console object)
console.log("ExtendScript doesn't have console");

// VIOLATION 2: Undefined variable (no-undef should catch this)
undefinedVariable = "This variable was never declared";

// VIOLATION 3: == instead of === (eqeqeq rule)
var comparison = (1 == "1"); // Should require ===

// VIOLATION 4: Missing curly braces (curly rule)
if (comparison)
  alert("Missing braces");

// VIOLATION 5: Double quotes instead of single (quotes rule)
var wrongQuotes = "Should use single quotes";

// VIOLATION 6: Missing semicolon (semi rule)
var missingSemicolon = "No semicolon here"

// VIOLATION 7: Wrong indentation (indent rule)
function wrongIndent() {
    return "4 spaces instead of 2";
}

/**
 * CORRECT ES3 PATTERNS:
 *
 * alert('ExtendScript alert works');
 * var declaredVariable = 'Properly declared';
 * var comparison = (1 === 1);
 * if (comparison) {
 *   alert('Braces required');
 * }
 * var correctQuotes = 'Single quotes';
 * var withSemicolon = 'Has semicolon';
 * function correctIndent() {
 *   return 'Two spaces';
 * }
 */
