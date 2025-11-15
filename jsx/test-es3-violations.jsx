/**
 * ES3 VIOLATION TEST FILE
 *
 * Purpose: Validate that ESLint catches ES3 violations in ExtendScript files
 * Expected: This file should FAIL linting with multiple errors
 *
 * This file intentionally uses ES6+ syntax that is forbidden in Adobe ExtendScript (ES3).
 * Each violation should be caught by ESLint before deployment.
 *
 * DO NOT USE THIS CODE IN PRODUCTION - FOR TESTING ONLY
 */

// VIOLATION 1: const keyword (ES6) - ES3 only supports var
const FORBIDDEN_CONST = "This should fail ESLint";

// VIOLATION 2: let keyword (ES6) - ES3 only supports var
let forbiddenLet = "This should also fail ESLint";

// VIOLATION 3: Arrow function (ES6) - ES3 requires function keyword
var forbiddenArrow = () => {
  return "Arrow functions not supported in ES3";
};

// VIOLATION 4: Template literals (ES6) - ES3 requires string concatenation
var forbiddenTemplate = `Template literals not supported in ES3`;

// VIOLATION 5: Object destructuring (ES6)
var obj = {a: 1, b: 2};
var {a, b} = obj;

// VIOLATION 6: Array destructuring (ES6)
var arr = [1, 2, 3];
var [first, second] = arr;

// VIOLATION 7: Default parameters (ES6)
function forbiddenDefault(param = "default") {
  return param;
}

// VIOLATION 8: Spread operator (ES6)
var arr1 = [1, 2, 3];
var arr2 = [...arr1, 4, 5];

/**
 * CORRECT ES3 PATTERNS (for reference):
 *
 * var ALLOWED_VAR = "ES3 compatible";
 * var allowedFunction = function() { return "ES3 compatible"; };
 * var allowedString = "ES3 " + "compatible";
 * var a = obj.a;
 * var b = obj.b;
 * function allowedFunction(param) {
 *   param = param || "default";
 *   return param;
 * }
 */
