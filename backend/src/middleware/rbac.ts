import { Request, Response, NextFunction } from 'express';

const authorizeRoles = (...permittedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !permittedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. Insufficient permissions.',
      });
      return;
    }
    next();
  };
};

export default authorizeRoles;
