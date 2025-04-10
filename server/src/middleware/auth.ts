import { Request, Response, NextFunction } from "express";

export const authenticateApi = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers["x-api-key"];
  const pagePassword = process.env.PAGE_PASSWORD;

  if (!apiKey || apiKey !== pagePassword) {
    return res.status(401).json({ error: "Unauthorized access" });
  }

  next();
};
