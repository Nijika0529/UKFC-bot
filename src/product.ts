import {mapper, LagrangeContext, PrivateMessage, GroupMessage, plugins, AddFriendOrGroupMessage, ApproveMessage} from 'lagrange.onebot';
import fs from "fs";
import path from "path";
import { logger } from './utils';
import { parseMessageRecord, saveRecordToFile, handleBotMention } from './impl';

export class Impl {

    // 将对于用于 1193466151 的应答函数装配进管线中


    @mapper.onGroup(691575403)
        async recordGroupMessage(c: LagrangeContext<GroupMessage>) {
            if (!c.message) {
                logger.warning('收到了一个没有消息内容的事件！');
                return;
            }

            try {
                const result = await c.getMsg(c.message.message_id);
                if (!result || result instanceof Error || !result.data) {
                    logger.error('获取消息详情失败!', result);
                    return;
                }
                const messageData = result.data;

                // 1. 解析消息
                const record = await parseMessageRecord(c, messageData);

                // 2. 如果消息有效，则保存
                if (record) {
                    const groupId = c.message.group_id;
                    await saveRecordToFile(record,groupId);
                }

                // 3. 处理 @bot 的情况
                await handleBotMention(c, messageData);

            } catch (error) {
                logger.error('处理群消息时发生未知错误:', error);
            } finally {
                // 4. 确保会话总是结束
                c.finishSession();
            }
        }
}


