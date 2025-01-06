import { Service } from "../abstract/Service";
import { logger } from "../middlewares/log";
import { Document } from "mongoose"
import { DBResp } from "../interfaces/DBResp";
import { resp } from "../utils/resp";
import { userModel } from "../orm/schemas/userSchemas";
import * as bcrypt from 'bcrypt';
import { verifyToken } from "../utils/token";
import { Request } from "express";
import { User } from "../interfaces/User";

export class UserService extends Service {

    public async getAllUserPoints(): Promise<Array<DBResp<User>> | undefined> {
        try {
            const users = await userModel
                .find({userRole: 'user'})
                .select('username points')
                .sort({ points: -1 });
            return users;
        } catch (error) {
            return undefined;
        }
    }

    public async updateByUserId(Request: Request): Promise<resp<DBResp<Document>|undefined>> {
        const resp: resp<DBResp<Document> | undefined> = {
            code: 200,
            message: "",
            body: undefined
        }
        try {
            const authHeader = Request.headers['authorization'];
            if (!authHeader) {
                resp.code = 401;
                resp.message = "未提供認證資訊";
                return resp;
            }
    
            const token = authHeader.split(' ')[1];
            const decoded = verifyToken(token) as { _id: string, userRole: string };
    
            // 檢查權限
            const { _id, username, email } = Request.body; // 從 body 取得要更新的用戶 ID
    
            if (decoded.userRole !== 'admin' && decoded._id !== _id) { // 檢查是否為管理員或本人
                resp.code = 403;
                resp.message = "權限不足";
                return resp;
            }
    
            if (!_id || !username || !email) {
                resp.code = 400;
                resp.message = "缺少必要資料";
                return resp;
            }
    
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                resp.code = 400;
                resp.message = "電子郵件格式錯誤";
                return resp;
            }
    
            const existingUser = await userModel.findById(_id);
            if (!existingUser) {
                resp.code = 404;
                resp.message = "找不到使用者";
                return resp;
            }
    
            if (existingUser.username === username && existingUser.email === email) {
                resp.code = 304;
                resp.message = "資料並未有更新";
                return resp;
            }
    
            existingUser.username = username;
            existingUser.email = email;
    
            await existingUser.save();
            
            resp.message = "更新資料成功";
            resp.body = existingUser;
            return resp;
    
        } catch (error) {
            resp.code = 500;
            resp.message = "伺服器異常";
            logger.error("user updating error: ", error);
        }
        return resp;
    }

    public async updatePoints(Request: Request): Promise<resp<DBResp<Document>|undefined>> {
        const resp: resp<DBResp<Document> | undefined> = {
            code: 200,
            message: "",
            body: undefined
        }
        try {
            const authHeader = Request.headers['authorization'];
            if (!authHeader) {
                resp.code = 401;
                resp.message = "未提供認證資訊";
                return resp;
            }

            const token = authHeader.split(' ')[1];
            const decoded = verifyToken(token) as { _id: string, userRole: string };
            const { _id, points } = Request.body;

            if (decoded.userRole !== 'admin' && decoded._id !== _id) { // 檢查是否為管理員或本人
                resp.code = 403;
                resp.message = "權限不足";
                return resp;
            }

            if (!_id || !points) {
                resp.code = 400;
                resp.message = "缺少必要資料";
                return resp;
            }
            const existingUser = await userModel.findById(_id);
            if (!existingUser) {
                resp.code = 404;
                resp.message = "找不到使用者";
                return resp;
            }
            existingUser.points = points;
            await existingUser.save();

            resp.message = "點數更新成功";
            resp.body = existingUser;
            return resp;
        }
        catch (error) {
            resp.code = 500;
            resp.message = "伺服器異常";
            logger.error("user updating points error: ", error);
        }
        return resp;
    }

    public async deleteByUserId(Request: Request): Promise<resp<DBResp<Document>|undefined>> {
        const resp: resp<DBResp<Document> | undefined> = {
            code: 200,
            message: "",
            body: undefined
        }
        try {
            const authHeader = Request.headers['authorization'];
            if (!authHeader) {
                resp.code = 401;
                resp.message = "未提供認證資訊";
                return resp;
            }

            const token = authHeader.split(' ')[1];
            const decoded = verifyToken(token) as { _id: string, userRole: string };
            const { _id, password } = Request.body;

            if (decoded.userRole !== 'admin' && decoded._id !== _id) { // 檢查是否為管理員或本人
                resp.code = 403;
                resp.message = "權限不足";
                return resp;
            }

            const user = await userModel.findById(_id);
            if (!user) {
                resp.code = 404;
                resp.message = "找不到使用者";
                return resp;
            }
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                resp.code = 401;
                resp.message = "密碼錯誤";
                return resp;
            }

            user.delete();
            resp.message = "刪除帳號成功";
            return resp;
        } catch (error) {
            resp.code = 500;
            resp.message = "伺服器異常";
            logger.error("Delete By UserId error: ", error);
        }

        return resp;
    }

    public async updatePassword(Request: Request): Promise<resp<DBResp<Document>|undefined>> {
        const resp: resp<DBResp<Document> | undefined> = {
            code: 200,
            message: "",
            body: undefined
        }
        try {
            const authHeader = Request.headers['authorization'];
            if (!authHeader) {
                resp.code = 401;
                resp.message = "未提供認證資訊";
                return resp;
            }

            const token = authHeader.split(' ')[1];
            const decoded = verifyToken(token) as { _id: string, userRole: string };
            const { _id, password, new_password } = Request.body;

            if (decoded._id !== _id) { // 檢查是否為本人
                resp.code = 403;
                resp.message = "權限不足";
                return resp;
            }

            const user = await userModel.findById(_id);
            if (!user) {
                resp.code = 404;
                resp.message = "找不到使用者";
                return resp;
            }

            const isPasswordCorrect = await bcrypt.compare(password, user.password);
            if (!isPasswordCorrect) {
                resp.code = 401;
                resp.message = "密碼錯誤";
                return resp;
            }

            user.password = await bcrypt.hash(new_password, 10);
            resp.body = await user.save();
            resp.message = "密碼修改成功";
        }
        catch (error) {
            resp.code = 500;
            resp.message = "伺服器異常";
            logger.error("update password error: ", error);
        }
        return resp;
    }
}