"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateApi = void 0;
const authenticateApi = (req, res, next) => {
    const apiKey = req.headers["x-api-key"];
    const pagePassword = process.env.PAGE_PASSWORD;
    console.log({ apiKey, pagePassword });
    if (!apiKey || apiKey !== pagePassword) {
        return res.status(401).json({ error: "Unauthorized access" });
    }
    next();
};
exports.authenticateApi = authenticateApi;
