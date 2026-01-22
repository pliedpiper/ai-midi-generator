"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/array-flatten";
exports.ids = ["vendor-chunks/array-flatten"];
exports.modules = {

/***/ "(ssr)/./node_modules/array-flatten/dist.es2015/index.js":
/*!*********************************************************!*\
  !*** ./node_modules/array-flatten/dist.es2015/index.js ***!
  \*********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   flatten: () => (/* binding */ flatten)\n/* harmony export */ });\n/**\n * Flatten an array indefinitely.\n */\nfunction flatten(array) {\n    var result = [];\n    $flatten(array, result);\n    return result;\n}\n/**\n * Internal flatten function recursively passes `result`.\n */\nfunction $flatten(array, result) {\n    for (var i = 0; i < array.length; i++) {\n        var value = array[i];\n        if (Array.isArray(value)) {\n            $flatten(value, result);\n        }\n        else {\n            result.push(value);\n        }\n    }\n}\n//# sourceMappingURL=index.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvYXJyYXktZmxhdHRlbi9kaXN0LmVzMjAxNS9pbmRleC5qcyIsIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ087QUFDUDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esb0JBQW9CLGtCQUFrQjtBQUN0QztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXMiOlsiL1VzZXJzL2thZGVuYmFydGhsb21lL0RvY3VtZW50cy9TY2hvb2wvMjAyNi1TcHJpbmcvQ1MgNDgwMC9haS1taWRpLWdlbmVyYXRvci9ub2RlX21vZHVsZXMvYXJyYXktZmxhdHRlbi9kaXN0LmVzMjAxNS9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEZsYXR0ZW4gYW4gYXJyYXkgaW5kZWZpbml0ZWx5LlxuICovXG5leHBvcnQgZnVuY3Rpb24gZmxhdHRlbihhcnJheSkge1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAkZmxhdHRlbihhcnJheSwgcmVzdWx0KTtcbiAgICByZXR1cm4gcmVzdWx0O1xufVxuLyoqXG4gKiBJbnRlcm5hbCBmbGF0dGVuIGZ1bmN0aW9uIHJlY3Vyc2l2ZWx5IHBhc3NlcyBgcmVzdWx0YC5cbiAqL1xuZnVuY3Rpb24gJGZsYXR0ZW4oYXJyYXksIHJlc3VsdCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHZhbHVlID0gYXJyYXlbaV07XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgJGZsYXR0ZW4odmFsdWUsIHJlc3VsdCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG59XG4vLyMgc291cmNlTWFwcGluZ1VSTD1pbmRleC5qcy5tYXAiXSwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbMF0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/array-flatten/dist.es2015/index.js\n");

/***/ })

};
;