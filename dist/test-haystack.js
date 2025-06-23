"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testHaystackIntegration = testHaystackIntegration;
var haystack_1 = require("./haystack");
/**
 * Test file for Haystack integration
 * Run this to verify the implementation is working correctly
 */
function testHaystackIntegration() {
    return __awaiter(this, void 0, void 0, function () {
        var initialized, testCases, _i, testCases_1, testCase, result, testTags, validation, dict, integrationResult;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('Testing Haystack Integration...\n');
                    return [4 /*yield*/, haystack_1.haystackService.initialize()];
                case 1:
                    initialized = _a.sent();
                    console.log("Service initialized: ".concat(initialized));
                    console.log("Service connected: ".concat(haystack_1.haystackService.isConnected(), "\n"));
                    // Test point name normalization
                    console.log('Testing point name normalization:');
                    testCases = [
                        { name: 'AHU_1_TEMP_SP', equipmentType: 'RTU', vendor: 'Schneider Electric' },
                        { name: 'VAV_ROOM_FB', equipmentType: 'VAV', vendor: 'Honeywell' },
                        { name: 'CHILLER_STATUS', equipmentType: 'Chiller', vendor: 'Daikin' },
                        { name: 'PUMP_SPEED_CMD', equipmentType: 'Pump', vendor: 'ABB' },
                        { name: 'HUM_SENSOR', equipmentType: 'Humidifier', vendor: 'AERCO' }
                    ];
                    for (_i = 0, testCases_1 = testCases; _i < testCases_1.length; _i++) {
                        testCase = testCases_1[_i];
                        result = haystack_1.haystackService.normalizePointName(testCase.name, testCase.equipmentType, testCase.vendor);
                        console.log("Original: \"".concat(testCase.name, "\""));
                        console.log("Normalized: \"".concat(result.normalizedName, "\""));
                        console.log("Tags: [".concat(result.tags.join(', '), "]"));
                        console.log("Confidence: ".concat(result.confidence));
                        console.log('---');
                    }
                    // Test tag validation
                    console.log('\nTesting tag validation:');
                    testTags = ['temp', 'sensor', 'sp', 'setpoint', 'invalid-tag', 'unknown'];
                    validation = haystack_1.haystackService.validateTags(testTags);
                    console.log("Tags: [".concat(testTags.join(', '), "]"));
                    console.log("Valid: ".concat(validation.valid));
                    console.log("Errors: [".concat(validation.errors.join(', '), "]"));
                    // Test dictionary creation
                    console.log('\nTesting Haystack dictionary creation:');
                    dict = haystack_1.haystackService.createHaystackDict({
                        id: 'test-point-001',
                        dis: 'Test Temperature Setpoint',
                        tags: ['temp', 'sp', 'sensor'],
                        kind: 'Number',
                        unit: '°F'
                    });
                    console.log('Created Haystack dictionary with keys:', dict.keys);
                    // Run integration test
                    console.log('\nRunning full integration test:');
                    return [4 /*yield*/, haystack_1.haystackService.testIntegration()];
                case 2:
                    integrationResult = _a.sent();
                    console.log("Success: ".concat(integrationResult.success));
                    console.log("Message: ".concat(integrationResult.message));
                    console.log('\nHaystack integration test completed successfully! ✅');
                    return [2 /*return*/];
            }
        });
    });
}
// If running directly
if (require.main === module) {
    testHaystackIntegration().catch(console.error);
}
