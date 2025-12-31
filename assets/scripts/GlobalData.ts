// assets/scripts/GlobalData.ts

export class GlobalData {
    public static playerData: any = null; // 存储玩家存档（金币、背包数组等）
    public static itemConfigs: any[] = [];   // 存所有物品的静态配置 (items.json 的内容)
    
    // 物品信息缓存：Key 是 itemId, Value 是物品详细对象
    private static _itemCache: Map<string, any> = new Map();

    /**
     * 获取物品详情（优先从缓存取，没有则返回 null）
     */
    public static getItemFromCache(itemId: string) {
        return this._itemCache.get(itemId) || null;
    }

    /**
     * 将物品详情存入缓存
     */
    public static saveItemToCache(itemId: string, data: any) {
        this._itemCache.set(itemId, data);
    }
}