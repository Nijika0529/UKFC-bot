import { OmAgent,AssistantMessage, UserMessage } from 'openmcp-sdk/service/sdk';
import { readJsonAsStringAsync } from './utils'

export async function getWeather(cityString: string): Promise<string> {
    const agent = new OmAgent();
    agent.loadMcpConfig('./weather_mcpconfig.json');  
    // const prompt = await agent.getPrompt('get_weather_code',{}); 
    const messages = [
        // UserMessage(prompt),
        UserMessage(`${cityString}的天气是?返回字符串格式,不要 md 格式`)
    ]
    const res = await agent.ainvoke({ messages});
    if (typeof res === 'string') {
            return res; 
        } 

}

export async function getGroupSummaryPDF(filepath: string) {
    const agent = new OmAgent();
    agent.loadMcpConfig('./qqsummary_mcpconfig.json');  
    const prompt = await agent.getPrompt('lead_summary',{}); 
    const groupjson = await readJsonAsStringAsync(filepath);
    const messages = [
        UserMessage(prompt),
        UserMessage(groupjson)
    ]
    const res = await agent.ainvoke({ messages});
}

export async function ragMemory(question: string) : Promise<string>{
    const agent = new OmAgent();
    agent.loadMcpConfig('./rag_mcpconfig.json');  
    const prompt = "调用工具search_memories去寻找,输出格式为字符串,做到回答精简.如果这个在记忆中没有,就直接返回我不知道,不要返回其他查询的记忆"
    const message = question
    const messages = [
        UserMessage(prompt),
        UserMessage(message)
    ]
    const res = await agent.ainvoke({ messages});
        if (typeof res === 'string') {
            return res; 
        } 
}

