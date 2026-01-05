import { _decorator, Component, Label, director, Node, Vec3, Prefab, instantiate } from 'cc';
import { NetManager } from './NetManager';
import { GlobalData } from './GlobalData';
import { PlayerController } from './PlayerController'; // 确保你创建了这个脚本


const { ccclass, property } = _decorator;

@ccclass('HUDManager')
export class HUDManager extends Component {
    @property(Label) nameLabel: Label = null;
    @property(Label) goldLabel: Label = null;
    @property(Label) levelLabel: Label = null;
    @property(Label) reputationLabel: Label = null;
    @property(Label) locationLabel: Label = null;

    private readonly MAP_NAMES: Record<string, string> = {
        "clinic_interior": "医馆内堂",
        "village_entrance": "杏花村口",
        "back_mountain": "后山药林",
        "market_street": "集市街口"
    };

    private playerId: string = "";

    onLoad() {
        this.playerId = localStorage.getItem("current_player_id");
        if (!this.playerId) {
            director.loadScene("SelectSave");
            return;
        }

        // --- 事件监听 ---
        // 1. 监听购买、任务等带来的全局玩家数据刷新
        director.on("UPDATE_PLAYER_HUD", this.handleDataUpdate, this);
        // 2. 监听来自 PlayerController 的实时坐标更新（高频）
        director.on("UPDATE_COORDINATES", this.handleCoordinateUpdate, this);

        this.setLoadingState();
    }

    onDestroy() {
        // 组件销毁时移除监听，防止内存泄露和报错
        director.off("UPDATE_PLAYER_HUD", this.handleDataUpdate, this);
        director.off("UPDATE_COORDINATES", this.handleCoordinateUpdate, this);
    }

    /**
     * 处理全局数据更新（如金币变化）
     */
    private handleDataUpdate(newData: any) {
        console.log("HUD 监听到数据更新:", newData);
        this.updateUI(newData);
    }

    /**
     * 处理高频坐标更新（仅刷新位置文本，不刷新其他 UI）
     */
    private handleCoordinateUpdate(posData: { mapId: string, x: number, y: number }) {
        const mapName = this.MAP_NAMES[posData.mapId] || posData.mapId;
        const posX = Math.floor(posData.x);
        const posY = Math.floor(posData.y);
        this.locationLabel.string = `${mapName} (X: ${posX}, Y: ${posY})`;
    }

    async start() {
        await this.initGameConfig();
        await this.refreshPlayerData();
    }

    async initGameConfig() {
        try {
            const items = await NetManager.getInstance().get("/item");
            GlobalData.itemConfigs = items;
        } catch (err) {
            console.error("加载物品配置失败");
        }
    }

    private setLoadingState() {
        this.nameLabel.string = "载入中...";
        this.goldLabel.string = "---";
        this.locationLabel.string = "正在定位...";
    }

    /**
     * 初始进入时调用：从网络拉取完整数据并定位玩家
     */
    async refreshPlayerData() {
        try {
            const data = await NetManager.getInstance().get(`/player/${this.playerId}`);
            GlobalData.playerData = data;
            
            // 1. 更新 HUD UI
            this.updateUI(data);

            // 2. 将场景中的玩家节点同步到存档位置
            this.syncPlayerNodePosition(data.lastPosition);
            
        } catch (e) {
            console.error("获取玩家数据失败", e);
        }
    }

    /**
     * 查找场景中的 Player 节点并设置其初始位置
     */
    private syncPlayerNodePosition(lastPos: any) {
        if (!lastPos) return;

        // 假设你的玩家节点路径是 Canvas/Player
        const playerNode = director.getScene().getChildByPath("Canvas/Player");
        if (playerNode) {
            // 设置物理位置
            playerNode.setPosition(new Vec3(lastPos.x, lastPos.y, 0));
            
            // 如果玩家脚本需要初始化 mapId 等状态
            const ctrl = playerNode.getComponent("PlayerController") as any;
            if (ctrl && ctrl.initPosition) {
                ctrl.initPosition(lastPos);
            }
            console.log(`[初始化] 玩家已定位至: ${lastPos.mapId} (${lastPos.x}, ${lastPos.y})`);
        } else {
            console.warn("场景中未找到 Player 节点，无法同步位置");
        }
    }

    /**
     * 核心 UI 渲染函数（用于金币、等级等属性同步）
     */
    private updateUI(data: any) {
        if (!data) return;

        this.nameLabel.string = data.nickname || "未知";
        this.goldLabel.string = `金币: ${data.gold}`;
        this.levelLabel.string = `等级: ${data.level}`;
        this.reputationLabel.string = `声望: ${data.reputation}`;

        // 初始化时的位置显示
        const pos = data.lastPosition;
        const mapId = pos?.mapId || "clinic_interior";
        const mapName = this.MAP_NAMES[mapId] || mapId;
        const posX = Math.floor(pos?.x || 0);
        const posY = Math.floor(pos?.y || 0);
        this.locationLabel.string = `${mapName} (X: ${posX}, Y: ${posY})`;
    }
    @property(Prefab) playerPrefab: Prefab = null; // 在编辑器里把你的 Player 预制体拖进来

    private spawnPlayer() {
        // 如果场景里没有玩家，就生成一个
        let playerNode = director.getScene().getChildByPath("Canvas/Player");
        if (!playerNode) {
            playerNode = instantiate(this.playerPrefab);
            playerNode.parent = director.getScene().getChildByName("Canvas");
        }
    }
}

