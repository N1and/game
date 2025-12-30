export class GameGlobal {
    // 假设这是登录成功后保存的ID
    public static playerId: string = "player_123456"; 
    
    // 药材配置（实际开发中建议读取JSON配置表）
    public static herbConfig = [
        { id: "item_licorice", name: "甘草", price: 10, season: "四季" },
        { id: "item_ginseng", name: "人参", price: 100, season: "秋季" },
        { id: "item_goji", name: "枸杞", price: 25, season: "夏秋" }
    ];
}