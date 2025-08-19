import { OmAgent,AssistantMessage, UserMessage } from 'openmcp-sdk/service/sdk';
import { readJsonAsStringAsync } from './utils'

export async function getWeather(cityString: string): Promise<string> {
    const agent = new OmAgent();
    agent.loadMcpConfig('./qqsummary_mcpconfig.json');  
    const prompt = await agent.getPrompt('get_weather_code',{}); 
    const messages = [
        UserMessage(prompt),
        UserMessage(`${cityString}的天气是？`)
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