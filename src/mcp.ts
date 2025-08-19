import { OmAgent,AssistantMessage, UserMessage } from 'openmcp-sdk/service/sdk';

export async function getWeather(cityString: string): Promise<string> {
    const agent = new OmAgent();
    agent.loadMcpConfig('./mcpconfig.json');  
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