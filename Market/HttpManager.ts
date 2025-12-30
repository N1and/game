import { _decorator, Component, log } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('HttpManager')
export class HttpManager {
    private static instance: HttpManager;
    // 根据截图中的IP地址
    private static readonly BASE_URL = "http://8.148.82.231:3000"; 

    public static getInstance(): HttpManager {
        if (!this.instance) {
            this.instance = new HttpManager();
        }
        return this.instance;
    }

    /**
     * 通用POST请求
     * @param apiPath 例如 "/market/buy"
     * @param data 请求体数据对象
     * @param onSuccess 成功回调
     * @param onFail 失败回调
     */
    public post(apiPath: string, data: any, onSuccess: (res: any) => void, onFail?: (err: any) => void) {
        const url = `${HttpManager.BASE_URL}${apiPath}`;
        
        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': '*/*'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(json => {
            log(`[API Success] ${apiPath}:`, json);
            if (onSuccess) onSuccess(json);
        })
        .catch(err => {
            log(`[API Error] ${apiPath}:`, err);
            if (onFail) onFail(err);
        });
    }
}