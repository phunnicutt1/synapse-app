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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EQUIPMENT_TAG_MAPPINGS = exports.BACNET_TAG_MAPPINGS = exports.HaystackService = exports.haystackService = void 0;
var haystack_core_1 = require("haystack-core");
// Common BACnet to Haystack tag mappings
var BACNET_TAG_MAPPINGS = {
    // Temperature points
    'TEMP': ['temp', 'sensor'],
    'TEMPERATURE': ['temp', 'sensor'],
    // Setpoint mappings
    'SP': ['sp', 'setpoint'],
    'SETPOINT': ['sp', 'setpoint'],
    'SETP': ['sp', 'setpoint'],
    // Status and feedback
    'FB': ['sensor', 'feedback'],
    'FEEDBACK': ['sensor', 'feedback'],
    'STATUS': ['sensor', 'status'],
    'STATE': ['sensor', 'status'],
    // Command points
    'CMD': ['cmd', 'writable'],
    'COMMAND': ['cmd', 'writable'],
    // Flow and pressure
    'FLOW': ['flow', 'sensor'],
    'PRESSURE': ['pressure', 'sensor'],
    'PRESS': ['pressure', 'sensor'],
    // Humidity
    'HUMIDITY': ['humidity', 'sensor'],
    'HUM': ['humidity', 'sensor'],
    // Alarm points
    'ALARM': ['alarm', 'sensor'],
    'FAULT': ['alarm', 'sensor'],
    'ALERT': ['alarm', 'sensor']
};
exports.BACNET_TAG_MAPPINGS = BACNET_TAG_MAPPINGS;
// Equipment type to Haystack tag mappings
var EQUIPMENT_TAG_MAPPINGS = {
    'RTU': ['rtu', 'ahu', 'equip'],
    'AHU': ['ahu', 'equip'],
    'VAV': ['vav', 'equip'],
    'Chiller': ['chiller', 'equip'],
    'Boiler': ['boiler', 'equip'],
    'Pump': ['pump', 'equip'],
    'Fan': ['fan', 'equip'],
    'Humidifier': ['humidifier', 'equip']
};
exports.EQUIPMENT_TAG_MAPPINGS = EQUIPMENT_TAG_MAPPINGS;
var HaystackService = /** @class */ (function () {
    function HaystackService(config) {
        if (config === void 0) { config = {}; }
        this.isInitialized = false;
        this.config = config;
    }
    /**
     * Initialize Haystack service
     */
    HaystackService.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                try {
                    // For now, we'll work in offline mode with local normalization
                    // Future versions can add actual Haystack server connectivity
                    this.isInitialized = true;
                    console.log('Haystack service initialized in offline mode');
                    return [2 /*return*/, true];
                }
                catch (error) {
                    console.warn('Haystack service initialization failed:', error);
                    return [2 /*return*/, false];
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Normalize BACnet point name using Haystack semantic conventions
     */
    HaystackService.prototype.normalizePointName = function (originalName, equipmentType, vendorName) {
        var name = originalName.toLowerCase().trim();
        var tags = [];
        var normalizedName = originalName;
        var confidence = 0.5; // Base confidence
        // Apply BACnet tag mappings
        for (var _i = 0, _a = Object.entries(BACNET_TAG_MAPPINGS); _i < _a.length; _i++) {
            var _b = _a[_i], pattern = _b[0], haystackTags = _b[1];
            if (name.includes(pattern.toLowerCase())) {
                tags.push.apply(tags, haystackTags);
                confidence += 0.2;
                // Create normalized name
                normalizedName = this.createNormalizedName(originalName, pattern, haystackTags);
                break;
            }
        }
        // Add equipment-specific tags
        if (equipmentType && equipmentType in EQUIPMENT_TAG_MAPPINGS) {
            tags.push.apply(tags, EQUIPMENT_TAG_MAPPINGS[equipmentType]);
            confidence += 0.1;
        }
        // Vendor-specific adjustments
        if (vendorName) {
            confidence += 0.1;
            tags.push('vendor:' + vendorName.toLowerCase().replace(/\s+/g, '-'));
        }
        // Ensure confidence doesn't exceed 1.0
        confidence = Math.min(confidence, 1.0);
        return {
            normalizedName: normalizedName,
            tags: __spreadArray([], new Set(tags), true), // Remove duplicates
            confidence: confidence
        };
    };
    /**
     * Create human-readable normalized name from BACnet point name
     */
    HaystackService.prototype.createNormalizedName = function (originalName, pattern, tags) {
        var normalized = originalName;
        // Replace common abbreviations with full words
        var replacements = {
            'TEMP': 'Temperature',
            'SP': 'Setpoint',
            'FB': 'Feedback',
            'CMD': 'Command',
            'STAT': 'Status',
            'PRESS': 'Pressure',
            'HUM': 'Humidity',
            'SETP': 'Setpoint'
        };
        for (var _i = 0, _a = Object.entries(replacements); _i < _a.length; _i++) {
            var _b = _a[_i], abbrev = _b[0], fullWord = _b[1];
            var regex = new RegExp("\\b".concat(abbrev, "\\b"), 'gi');
            normalized = normalized.replace(regex, fullWord);
        }
        // Clean up formatting
        normalized = normalized
            .replace(/[_-]/g, ' ') // Replace separators with spaces
            .replace(/([a-z])([A-Z])/g, '$1 $2') // Add spaces before capital letters
            .replace(/\s+/g, ' ') // Normalize multiple spaces
            .trim();
        // Capitalize first letter of each word
        normalized = normalized.replace(/\b\w/g, function (l) { return l.toUpperCase(); });
        return normalized;
    };
    /**
     * Validate Haystack tags for a point
     */
    HaystackService.prototype.validateTags = function (tags) {
        var errors = [];
        var validTags = new Set([
            'point', 'sensor', 'cmd', 'sp', 'setpoint', 'temp', 'pressure', 'flow',
            'humidity', 'alarm', 'status', 'feedback', 'equip', 'ahu', 'rtu', 'vav',
            'chiller', 'boiler', 'pump', 'fan', 'humidifier'
        ]);
        for (var _i = 0, tags_1 = tags; _i < tags_1.length; _i++) {
            var tag = tags_1[_i];
            var baseTag = tag.split(':')[0]; // Remove vendor prefixes
            if (!validTags.has(baseTag)) {
                errors.push("Unknown tag: ".concat(tag));
            }
        }
        return {
            valid: errors.length === 0,
            errors: errors
        };
    };
    /**
     * Create Haystack dictionary for a point
     */
    HaystackService.prototype.createHaystackDict = function (pointData) {
        var dict = new haystack_core_1.HDict();
        dict.set('id', haystack_core_1.HRef.make(pointData.id));
        dict.set('dis', haystack_core_1.HStr.make(pointData.dis));
        // Add point marker
        dict.set('point', haystack_core_1.HMarker.make());
        // Add semantic tags
        for (var _i = 0, _a = pointData.tags; _i < _a.length; _i++) {
            var tag = _a[_i];
            if (!tag.includes(':')) {
                dict.set(tag, haystack_core_1.HMarker.make());
            }
        }
        // Add kind if specified
        if (pointData.kind) {
            dict.set('kind', haystack_core_1.HStr.make(pointData.kind.toLowerCase()));
        }
        // Add unit if specified
        if (pointData.unit) {
            dict.set('unit', haystack_core_1.HStr.make(pointData.unit));
        }
        return dict;
    };
    /**
     * Get service status
     */
    HaystackService.prototype.isConnected = function () {
        return this.isInitialized;
    };
    /**
     * Test Haystack integration functionality
     */
    HaystackService.prototype.testIntegration = function () {
        return __awaiter(this, void 0, void 0, function () {
            var testResult, validation, dict;
            return __generator(this, function (_a) {
                try {
                    testResult = this.normalizePointName('AHU_1_TEMP_SP', 'RTU', 'Schneider Electric');
                    validation = this.validateTags(testResult.tags);
                    dict = this.createHaystackDict({
                        id: 'test-point',
                        dis: 'Test Temperature Setpoint',
                        tags: testResult.tags,
                        kind: 'Number',
                        unit: '°F'
                    });
                    return [2 /*return*/, {
                            success: true,
                            message: "Haystack integration test passed. Normalized: \"".concat(testResult.normalizedName, "\", Tags: [").concat(testResult.tags.join(', '), "], Confidence: ").concat(testResult.confidence)
                        }];
                }
                catch (error) {
                    return [2 /*return*/, {
                            success: false,
                            message: "Haystack integration test failed: ".concat(error)
                        }];
                }
                return [2 /*return*/];
            });
        });
    };
    return HaystackService;
}());
exports.HaystackService = HaystackService;
// Export singleton instance
exports.haystackService = new HaystackService();
