import {mapper, LagrangeContext, PrivateMessage, GroupMessage, plugins, AddFriendOrGroupMessage, ApproveMessage} from 'lagrange.onebot';
import { logger } from './utils';
import { parseMessageRecord, saveRecordToFile, handleBotMention,handlePossibleCommand } from './impl';
import * as dotenv from 'dotenv';

dotenv.config();
const fox_home = Number(process.env.fox_home_GROUP_ID);


export class Impl {

    @mapper.onGroup(fox_home)
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


