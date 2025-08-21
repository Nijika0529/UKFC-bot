import {mapper, LagrangeContext, PrivateMessage, GroupMessage, plugins, AddFriendOrGroupMessage, ApproveMessage} from 'lagrange.onebot';
import { logger } from './utils';
import { parseMessageRecord, saveRecordToFile, handleBotMention, handlePossibleCommand } from './impl';
import * as dotenv from 'dotenv';
import { ragMemory } from './mcp';


dotenv.config();
const mainGroupId = Number(process.env.main_GROUP_ID);
const Docker_TEST = Number(process.env.Docker_TEST);

export class Impl {

     @mapper.onGroup(mainGroupId)
        async recordGroupMessage_executeCommand(c: LagrangeContext<GroupMessage>) {
            const plainText = c.message.raw_message || '';

            try {
                const result = await c.getMsg(c.message.message_id);
                if (!result || result instanceof Error || !result.data) {
                    logger.error('获取消息详情失败!', result);
                return;
            }
                const data = result.data;
            if (result && !(result instanceof Error) && result.data) {
                const record = await parseMessageRecord(c, result.data);
                if (record && record.content.trim() !== '') {
                    await saveRecordToFile(record, c.message.group_id);
                    await handlePossibleCommand(c);
                }
                if (Array.isArray(data.message) && data.message.some((m: any) => m.type === "at" && m.data?.qq == Docker_TEST)) {
                    const question = c.message.message
                    .filter(segment => segment.type === 'text')
                    .map(segment => segment.data.text.trim())
                    .join(' ');
                    const reply = await ragMemory(question);
                    c.sendGroupMsg(mainGroupId,reply);
                }
            }
        } catch (error) {
            logger.error(`[群: ${c.message.group_id}] 记录消息时发生错误:`, error);
        }
        
    }
}