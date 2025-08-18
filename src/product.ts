import {mapper, LagrangeContext, PrivateMessage, GroupMessage, plugins, AddFriendOrGroupMessage, ApproveMessage} from 'lagrange.onebot';
import fs from "fs";
import path from "path";
import { logger } from './utils';
import { parseMessageRecord, saveRecordToFile, handleBotMention,handlePossibleCommand } from './impl';

export class Impl {

    // 将对于用于 1193466151 的应答函数装配进管线中


    @mapper.onGroup(691575403)
        async recordGroupMessage_executeCommand(c: LagrangeContext<GroupMessage>) {
                    const plainText = c.message.raw_message || '';
        
                    try {
                        const result = await c.getMsg(c.message.message_id);
                    if (result && !(result instanceof Error) && result.data) {
                        const record = await parseMessageRecord(c, result.data);
                        if (record && record.content.trim() !== '') {
                            await saveRecordToFile(record, c.message.group_id);
                            await handlePossibleCommand(c);
                        }
                    }
                } catch (error) {
                    logger.error(`[群: ${c.message.group_id}] 记录消息时发生错误:`, error);
                }
                
            }
}


