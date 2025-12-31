import { _decorator, Component, Label, director, Node, Vec3 } from 'cc';
import { NetManager } from './NetManager';
const { ccclass, property } = _decorator;
import { GlobalData } from './GlobalData';

@ccclass('HUDManager')
export class HUDManager extends Component {
    // --- UI 文本引用 ---
    @property(Label) nameLabel: Label = null;
    @property(Label) goldLabel: Label = null;
    @property(Label) levelLabel: Label = null;
    @property(Label) reputationLabel: Label = null;
    @property(Label) locationLabel: Label = null; // 位置与坐标显示

    // --- 地图 ID 对应中文名映射 ---
    private readonly MAP_NAMES: Record<string, string> = {
        "clinic_interior": "医馆内堂",
        "village_entrance": "杏花村口",
        "back_mountain": "后山药林",
        "market_street": "集市街口"
    };

    private playerId: string = "";
    backpackPanel: any;

    onLoad() {
        this.playerId = localStorage.getItem("current_player_id");
        if (!this.playerId) {
            director.loadScene("SelectSave");
            return;
        }
        this.setLoadingState();
        if (this.backpackPanel) {
        this.backpackPanel.active = false;
    }
    }

    async initGameConfig() {
        try {
            // 假设你有一个获取所有物品配置的接口 GET /item
            const items = await NetManager.getInstance().get("/item");
            GlobalData.itemConfigs = items;
        } catch (err) {
            console.error("加载物品配置失败");
        }
    }

    async start() {
    await this.initGameConfig(); // 1. 先拉取物品表
    await this.refreshPlayerData(); // 2. 再拉取玩家数据
    }

    private setLoadingState() {
        this.nameLabel.string = "载入中...";
        this.goldLabel.string = "---";
        this.locationLabel.string = "正在定位...";
    }

    /**
     * 拉取数据并同步
     */
    async refreshPlayerData() {
        const data = await NetManager.getInstance().get(`/player/${this.playerId}`);
        GlobalData.playerData = data; // 存入全局
        this.updateUI(data);
    }

    /**
     * 核心：更新 UI 文字（包含地图与坐标）
     */
    private updateUI(data: any) {
        this.nameLabel.string = data.nickname;
        this.goldLabel.string = `金币: ${data.gold}`;
        this.levelLabel.string = `等级: ${data.level}`;
        this.reputationLabel.string = `声望: ${data.reputation}`;

        // 格式化位置与坐标
        const pos = data.lastPosition;
        const mapId = pos?.mapId || "clinic_interior";
        const mapName = this.MAP_NAMES[mapId] || mapId;
        
        // 取整处理坐标，防止出现 0.000001 这种长小数
        const posX = Math.floor(pos?.x || 0);
        const posY = Math.floor(pos?.y || 0);

        // 显示效果：医馆内堂 (X: 0, Y: 0)
        this.locationLabel.string = `${mapName} (X: ${posX}, Y: ${posY})`;
    }

    /**
     * 同步物理位置
     */
    private syncWorldPosition(pos: any) {
        if (!pos) return;
        // 查找场景中名为 Player 的节点
        const playerNode = director.getScene().getChildByPath("Canvas/Player");
        if (playerNode) {
            playerNode.setPosition(new Vec3(pos.x, pos.y, 0));
            console.log(`[同步] 已将角色放置于坐标: ${pos.x}, ${pos.y}`);
        }
    }
}