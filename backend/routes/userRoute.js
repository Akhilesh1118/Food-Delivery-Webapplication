import express from 'express';
import {loginUser, loginAdmin, registerUser, listManagedAccounts, createManagedAccount} from '../controllers/userController.js';
import authMiddleware, { requireAdmin } from '../middleware/auth.js';

const userRouter = express.Router();

userRouter.post('/register', registerUser);
userRouter.post('/login', loginUser);
userRouter.post('/admin/login', loginAdmin);
userRouter.get('/admin/accounts', authMiddleware, requireAdmin, listManagedAccounts);
userRouter.post('/admin/accounts', authMiddleware, requireAdmin, createManagedAccount);

export default userRouter;
