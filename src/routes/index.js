"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_route_1 = __importDefault(require("./user.route"));
const common_route_1 = __importDefault(require("./common.route"));
const usercommon_route_1 = __importDefault(require("./usercommon.route"));
const router = (0, express_1.Router)();
const ProductionRoutes = [
    {
        path: "/auth",
        route: user_route_1.default
    },
    {
        path: "/cad",
        route: common_route_1.default
    },
    {
        path: "/product",
        route: common_route_1.default
    },
    {
        path: "/usercommon",
        route: usercommon_route_1.default
    }
];
ProductionRoutes.forEach((route) => {
    router.use(route.path, route.route);
});
exports.default = router;
