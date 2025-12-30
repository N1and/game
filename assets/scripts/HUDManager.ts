// assets/scripts/HUDManager.ts
import { _decorator, Component, Label, director } from 'cc';
import { NetManager } from './NetManager';
const { ccclass, property } = _decorator;

@ccclass('HUDManager')
export class HUDManager extends Component {
    @property(Label) nameLabel: Label = null;
    @property(Label) goldLabel: Label = null;
    @property(Label) levelLabel: Label = null;
    @property(Label) reputationLabel: Label = null;

    private playerId: string = "";

    async onLoad() {
        // 从本地存储获取之前选中的玩家 ID
        this.playerId = localStorage.getItem("current_player_id");

        if (!this.playerId) {
            console.error("未找到玩家存档ID，返回选档界面");
            director.loadScene("SelectSave");
            return;
        }

        // 初始化 UI（显示加载中）
        this.setInitialUI();

        // 拉取最新的存档数据
        await this.refreshPlayerData();
    }

    setInitialUI() {
        this.nameLabel.string = "加载中...";
        this.goldLabel.string = "---";
        this.levelLabel.string = "-";
        this.reputationLabel.string = "-";
    }

    /**
     * 从后端刷新玩家数据
     */
    async refreshPlayerData() {
        try {
            // 请求接口 GET /player/{id}
            const data = await NetManager.getInstance().get(`/player/${this.playerId}`);
            
            // 更新 GUI 显示
            this.updateGUI(data);

            // 【预留逻辑】还原玩家位置
            this.syncPlayerPosition(data.lastPosition);

        } catch (err) {
            console.error("刷新玩家数据失败:", err);
        }
    }

    updateGUI(data: any) {
        this.nameLabel.string = data.nickname;
        this.goldLabel.string = data.gold.toString();
        this.levelLabel.string = "等级: " + data.level.toString();
        this.reputationLabel.string = "声望: " + data.reputation.toString();
    }

    syncPlayerPosition(pos: any) {
        // 逻辑：找到场景里的 Player 节点，设置其 position
        console.log(`同步玩家位置至地图: ${pos.mapId}, 坐标: ${pos.x}, ${pos.y}`);
    }
}