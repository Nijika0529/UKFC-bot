import {mapper, LagrangeContext, PrivateMessage, GroupMessage, plugins, AddFriendOrGroupMessage, ApproveMessage} from 'lagrange.onebot';
import { logger } from './utils';
import { parseMessageRecord, saveRecordToFile, handleBotMention, handlePossibleCommand } from './impl';
import * as dotenv from 'dotenv';
import { ragMemory } from './mcp';

const newMembers: Map<number, { ids: number[], names: string[], timer?: NodeJS.Timeout }> = new Map();

dotenv.config();
const new_GROUP_ID = Number(process.env.new_GROUP_ID);
const Docker_TEST = Number(process.env.Docker_TEST);

export class Impl {

     @mapper.onGroup(new_GROUP_ID)
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
                // if (Array.isArray(data.message) && data.message.some((m: any) => m.type === "at" && m.data?.qq == Docker_TEST)) {
                //     const question = c.message.message
                //     .filter(segment => segment.type === 'text')
                //     .map(segment => segment.data.text.trim())
                //     .join(' ');
                //     const reply = await ragMemory(question);
                //     c.sendGroupMsg(new_GROUP_ID,reply);
                // }
            }
        } catch (error) {
            logger.error(`[群: ${c.message.group_id}] 记录消息时发生错误:`, error);
        }
        
    }

    @mapper.onGroupIncrease(new_GROUP_ID)
            async handleGroupIncreaseTest(c: LagrangeContext<ApproveMessage>) {
            const newMemberId = c.message.user_id;
            const groupId = c.message.group_id;
    
            // 获取用户昵称
            let newMemberName = 'new';
            try {
                const userInfo = await c.getStrangerInfo(newMemberId);
                if (userInfo && 'retcode' in userInfo && userInfo.retcode === 0 && userInfo.data) {
                    newMemberName = userInfo.data.nickname;
                }
            } catch (e) {
                console.error(`Failed to get user info for ID: ${newMemberId}`, e);
            }
    
            // 拿到当前群的缓存，没有就建一个
            let groupCache = newMembers.get(groupId);
            if (!groupCache) {
                groupCache = { ids: [], names: [] };
                newMembers.set(groupId, groupCache);
            }
    
            // ✅ 追加，而不是覆盖
            groupCache.ids.push(newMemberId);
            groupCache.names.push(newMemberName);
    
            // 如果还没定时器，启动一个
            if (!groupCache.timer) {
                groupCache.timer = setTimeout(async () => {
                    const names = groupCache!.names.join(', ');
                    await c.sendGroupMsg(groupId, `欢迎 ${names} 加入 UKFC 2025届迎新群！🎉入群请查看群文件【入群必看】【各方向入门指北】，有多方向学习资料供新手入门。与战队/ctf/军训及其他校内相关的事情均可@管理员或在群内互助交流`);
    
                    // 清理缓存，下一波重新计时
                    newMembers.delete(groupId);
                }, 60000); // 一分钟合并一次
            }
        }
    
}