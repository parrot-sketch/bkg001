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
var client_1 = require("@prisma/client");
var faker_1 = require("@faker-js/faker");
var url_1 = require("url");
var path_1 = require("path");
var index_js_1 = require("../utils/index.js");
var __filename = (0, url_1.fileURLToPath)(import.meta.url);
var __dirname = (0, path_1.dirname)(__filename);
var prisma = new client_1.PrismaClient();
function seed() {
    return __awaiter(this, void 0, void 0, function () {
        var staffRoles, _i, staffRoles_1, role, mobile, doctors, i, doctor, patients, i, patient, i, doctor, patient;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log("Seeding data...");
                    staffRoles = ["NURSE", "CASHIER", "LAB_TECHNICIAN"];
                    _i = 0, staffRoles_1 = staffRoles;
                    _b.label = 1;
                case 1:
                    if (!(_i < staffRoles_1.length)) return [3 /*break*/, 4];
                    role = staffRoles_1[_i];
                    mobile = faker_1.fakerDE.phone.number();
                    return [4 /*yield*/, prisma.staff.create({
                            data: {
                                id: (_a = faker_1.fakerDE.string) === null || _a === void 0 ? void 0 : _a.uuid(),
                                email: faker_1.fakerDE.internet.email(),
                                name: faker_1.fakerDE.name.fullName(),
                                phone: mobile,
                                address: faker_1.fakerDE.address.streetAddress(),
                                department: faker_1.fakerDE.company.name(),
                                role: role,
                                status: "ACTIVE",
                                colorCode: (0, index_js_1.generateRandomColor)(),
                            },
                        })];
                case 2:
                    _b.sent();
                    _b.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    doctors = [];
                    i = 0;
                    _b.label = 5;
                case 5:
                    if (!(i < 10)) return [3 /*break*/, 8];
                    return [4 /*yield*/, prisma.doctor.create({
                            data: {
                                id: faker_1.fakerDE.string.uuid(),
                                email: faker_1.fakerDE.internet.email(),
                                name: faker_1.fakerDE.name.fullName(),
                                specialization: faker_1.fakerDE.name.jobType(),
                                license_number: faker_1.fakerDE.string.uuid(),
                                phone: faker_1.fakerDE.phone.number(),
                                address: faker_1.fakerDE.address.streetAddress(),
                                department: faker_1.fakerDE.company.name(),
                                availability_status: "ACTIVE",
                                colorCode: (0, index_js_1.generateRandomColor)(),
                                type: i % 2 === 0 ? "FULL" : "PART",
                                working_days: {
                                    create: [
                                        {
                                            day: "Monday",
                                            start_time: "08:00",
                                            close_time: "17:00",
                                        },
                                        {
                                            day: "Wednesday",
                                            start_time: "08:00",
                                            close_time: "17:00",
                                        },
                                    ],
                                },
                            },
                        })];
                case 6:
                    doctor = _b.sent();
                    doctors.push(doctor);
                    _b.label = 7;
                case 7:
                    i++;
                    return [3 /*break*/, 5];
                case 8:
                    patients = [];
                    i = 0;
                    _b.label = 9;
                case 9:
                    if (!(i < 20)) return [3 /*break*/, 12];
                    return [4 /*yield*/, prisma.patient.create({
                            data: {
                                id: faker_1.fakerDE.string.uuid(),
                                first_name: faker_1.fakerDE.name.firstName(),
                                last_name: faker_1.fakerDE.name.lastName(),
                                date_of_birth: faker_1.fakerDE.date.birthdate(),
                                gender: i % 2 === 0 ? "MALE" : "FEMALE",
                                phone: faker_1.fakerDE.phone.number(),
                                email: faker_1.fakerDE.internet.email(),
                                marital_status: i % 3 === 0 ? "Married" : "Single",
                                address: faker_1.fakerDE.address.streetAddress(),
                                emergency_contact_name: faker_1.fakerDE.name.fullName(),
                                emergency_contact_number: faker_1.fakerDE.phone.number(),
                                relation: "Sibling",
                                blood_group: i % 4 === 0 ? "O+" : "A+",
                                allergies: faker_1.fakerDE.lorem.words(2),
                                medical_conditions: faker_1.fakerDE.lorem.words(3),
                                privacy_consent: true,
                                service_consent: true,
                                medical_consent: true,
                                colorCode: (0, index_js_1.generateRandomColor)(),
                            },
                        })];
                case 10:
                    patient = _b.sent();
                    patients.push(patient);
                    _b.label = 11;
                case 11:
                    i++;
                    return [3 /*break*/, 9];
                case 12:
                    i = 0;
                    _b.label = 13;
                case 13:
                    if (!(i < 20)) return [3 /*break*/, 16];
                    doctor = doctors[Math.floor(Math.random() * doctors.length)];
                    patient = patients[Math.floor(Math.random() * patients.length)];
                    return [4 /*yield*/, prisma.appointment.create({
                            data: {
                                patient_id: patient.id,
                                doctor_id: doctor.id,
                                appointment_date: faker_1.fakerDE.date.soon(),
                                time: "10:00",
                                status: i % 4 === 0 ? "PENDING" : "SCHEDULED",
                                type: "Checkup",
                                reason: faker_1.fakerDE.lorem.sentence(),
                            },
                        })];
                case 14:
                    _b.sent();
                    _b.label = 15;
                case 15:
                    i++;
                    return [3 /*break*/, 13];
                case 16:
                    console.log("Seeding complete!");
                    return [4 /*yield*/, prisma.$disconnect()];
                case 17:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
seed().catch(function (e) {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
});
