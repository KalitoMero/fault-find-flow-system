import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db';

export interface AuthRequest extends Request {
  userId?: string;
  userRoles?: string[];
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Kein Token vorhanden' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    
    // Rollen laden
    const rolesResult = await query(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [decoded.userId]
    );

    req.userId = decoded.userId;
    req.userRoles = rolesResult.rows.map(r => r.role);
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Ungültiger Token' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRoles || !roles.some(r => req.userRoles!.includes(r))) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }
    next();
  };
};

export const isAdmin = (req: AuthRequest): boolean => {
  return req.userRoles?.includes('admin') || false;
};
