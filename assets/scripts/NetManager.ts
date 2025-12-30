// assets/scripts/network/NetManager.ts

export class NetManager {
    private static instance: NetManager;
    private baseUrl: string = "http://8.148.82.231:3000"; // 你的云服务器地址
    private token: string = "";

    public static getInstance(): NetManager {
        if (!this.instance) this.instance = new NetManager();
        return this.instance;
    }

    // 设置 Token
    setToken(token: string) {
        this.token = token;
        localStorage.setItem("jwt_token", token); // 持久化存储
    }

    // 基础 POST 请求
    async post(endpoint: string, data: any) {
        const headers = {
            "Content-Type": "application/json",
        };
        if (this.token) {
            headers["Authorization"] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: "POST",
                headers: headers,
                body: JSON.stringify(data),
            });
            const result = await response.json();
            if (!response.ok) throw result; // 抛出后端返回的错误信息
            return result;
        } catch (error) {
            console.error(`请求错误 ${endpoint}:`, error);
            throw error;
        }
    }

    async get(endpoint: string) {
    const headers = {
        "Authorization": `Bearer ${this.token}`, // 必须带 Token
    };
    try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: "GET",
            headers: headers,
        });
        const result = await response.json();
        if (!response.ok) throw result;
        return result;
    } catch (error) {
        console.error(`GET 请求错误 ${endpoint}:`, error);
        throw error;
    }
}
}
