"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateBMI = exports.daysOfWeek = void 0;
exports.formatNumber = formatNumber;
exports.getInitials = getInitials;
exports.formatDateTime = formatDateTime;
exports.calculateAge = calculateAge;
exports.generateRandomColor = generateRandomColor;
exports.generateTimes = generateTimes;
exports.calculateDiscount = calculateDiscount;
function formatNumber(amount) {
    return amount === null || amount === void 0 ? void 0 : amount.toLocaleString("en-US", {
        maximumFractionDigits: 0,
    });
}
function getInitials(name) {
    var words = name.trim().split(" ");
    var firstTwoWords = words.slice(0, 2);
    var initials = firstTwoWords.map(function (word) { return word.charAt(0).toUpperCase(); });
    return initials.join("");
}
function formatDateTime(isoDate) {
    var date = new Date(isoDate);
    var options = {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        // timeZoneName: "short", // "UTC"
    };
    return date.toLocaleString("en-US", options);
}
function calculateAge(dob) {
    var today = new Date();
    var years = today.getFullYear() - dob.getFullYear();
    var months = today.getMonth() - dob.getMonth();
    if (months < 0) {
        years--;
        months += 12;
    }
    if (months === 0 && today.getDate() < dob.getDate()) {
        years--;
        months = 11;
    }
    if (years === 0) {
        return "".concat(months, " months old");
    }
    var ageString = "".concat(years, " years");
    if (months > 0) {
        ageString += " ".concat(months, " months");
    }
    return ageString + " old";
}
exports.daysOfWeek = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
];
function generateRandomColor() {
    var letters = "0123456789ABCDEF";
    var color = "#";
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}
function formatTime(hour, minute) {
    var period = hour >= 12 ? "PM" : "AM";
    var adjustedHour = hour % 12 || 12;
    var formattedMinute = minute.toString().padStart(2, "0");
    return "".concat(adjustedHour, ":").concat(formattedMinute, " ").concat(period);
}
function generateTimes(start_hour, close_hour, interval_in_minutes) {
    var times = [];
    var startHour = start_hour;
    var endHour = close_hour;
    var intervalMinutes = interval_in_minutes;
    for (var hour = startHour; hour <= endHour; hour++) {
        for (var minute = 0; minute < 60; minute += intervalMinutes) {
            if (hour === endHour && minute > 0)
                break;
            var formattedTime = formatTime(hour, minute);
            times.push({ label: formattedTime, value: formattedTime });
        }
    }
    return times;
}
var calculateBMI = function (weight, height) {
    var heightInMeters = height / 100;
    var bmi = weight / (heightInMeters * heightInMeters);
    var status;
    var colorCode;
    if (bmi < 18.5) {
        status = "Underweight";
        colorCode = "#1E90FF";
    }
    else if (bmi >= 18.5 && bmi <= 24.9) {
        status = "Normal";
        colorCode = "#1E90FF";
    }
    else if (bmi >= 25 && bmi <= 29.9) {
        status = "Overweight";
        colorCode = "#FF9800";
    }
    else {
        status = "Obesity";
        colorCode = "#FF5722";
    }
    return {
        bmi: parseFloat(bmi.toFixed(2)),
        status: status,
        colorCode: colorCode,
    };
};
exports.calculateBMI = calculateBMI;
function calculateDiscount(_a) {
    var amount = _a.amount, discount = _a.discount, discountPercentage = _a.discountPercentage;
    if (discount != null && discountPercentage != null) {
        throw new Error("Provide either discount amount or discount percentage, not both.");
    }
    if (discount != null) {
        // Calculate discount percentage if a discount amount is provided
        var discountPercent = (discount / amount) * 100;
        return {
            finalAmount: amount - discount,
            discountPercentage: discountPercent,
            discountAmount: discount,
        };
    }
    else if (discountPercentage != null) {
        // Calculate discount amount if a discount percentage is provided
        var discountAmount = (discountPercentage / 100) * amount;
        return {
            finalAmount: amount - discountAmount,
            discountPercentage: discountPercentage,
            discountAmount: discountAmount,
        };
    }
    else {
        throw new Error("Please provide either a discount amount or a discount percentage.");
    }
}
