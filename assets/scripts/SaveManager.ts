import { _decorator, Component, Node, Label, Prefab, instantiate, EditBox, director, Button, Color, Sprite } from 'cc';
import { NetManager } from './NetManager';
const { ccclass, property } = _decorator;

@ccclass('SaveManager')
export class SaveManager extends Component {
    @property(Node) saveListLayout: Node = null; // 存放存档列表的布局容器
    @property(Prefab) saveItemPrefab: Prefab = null; // 单个存档条目的预制体
    
    @property(Node) createPanel: Node = null; // 新建存档的弹窗面板
    @property(EditBox) nicknameInput: EditBox = null; // 昵称输入框
    @property(Label) tipsLabel: Label = null; // 提示文字
    
    @property(Button) confirmBtn: Button = null; // 确认进入按钮

    private selectedPlayerId: string = ""; // 当前选中的存档ID
    private currentSavesCount: number = 0;

    start() {
        this.createPanel.active = false;
        this.confirmBtn.interactable = false;
        this.refreshSaveList();
    }

    // 获取并刷新存档列表
    async refreshSaveList() {
        try {
            this.tipsLabel.string = "正在加载存档...";
            const saves = await NetManager.getInstance().get("/player/list-saves");
            
            this.currentSavesCount = saves.length;
            this.renderSaves(saves);
            this.tipsLabel.string = `已有存档: ${this.currentSavesCount}/6`;
        } catch (err) {
            this.tipsLabel.string = "加载失败";
        }
    }

    // 渲染存档 UI
    renderSaves(saves: any[]) {
        if (!this.saveListLayout) {
            console.error("错误：Save List Layout 未在属性检查器中绑定！");
            return;
        }
        
        // 清空旧列表
        this.saveListLayout.removeAllChildren();

        if (!saves || !Array.isArray(saves)) return;

        saves.forEach(data => {
            if (!this.saveItemPrefab) {
                console.error("错误：Save Item Prefab 未绑定！");
                return;
            }

            const item = instantiate(this.saveItemPrefab);
            item.parent = this.saveListLayout;
            
            // --- 核心修复：增加安全获取组件的逻辑 ---
            const nameNode = item.getChildByName("NameLabel");
            if (nameNode) {
                const label = nameNode.getComponent(Label);
                if (label) label.string = data.nickname || "无名氏";
            } else {
                console.warn("预制体中找不到名为 NameLabel 的节点");
            }

            const infoNode = item.getChildByName("InfoLabel");
            if (infoNode) {
                const label = infoNode.getComponent(Label);
                if (label) label.string = `等级: ${data.level}  金币: ${data.gold}`;
            }
            
            // 绑定点击事件
            item.on(Node.EventType.TOUCH_END, () => {
                this.onSelectSave(data._id, item);
            });
        });
    }

    // 处理选中逻辑
    onSelectSave(playerId: string, itemNode: Node) {
        this.selectedPlayerId = playerId;
        this.confirmBtn.interactable = true;
        
        // 简单的视觉反馈：高亮选中的节点 (需根据你的预制体调整)
        this.saveListLayout.children.forEach(child => {
            child.getComponent(Sprite).color = Color.WHITE;
        });
        itemNode.getComponent(Sprite).color = Color.YELLOW; 
    }

    // 打开新建面板
    onOpenCreatePanel() {
        if (this.currentSavesCount >= 6) {
            this.tipsLabel.string = "存档已满(上限6个)";
            return;
        }
        this.createPanel.active = true;
    }

    // 提交新建存档
    async onSubmitCreate() {
        const nickname = this.nicknameInput.string;
        if (!nickname) return;

        try {
            await NetManager.getInstance().post("/player/create-save", { nickname });
            this.createPanel.active = false;
            this.refreshSaveList(); // 刷新
        } catch (err) {
            this.tipsLabel.string = "创建失败: " + err.message;
        }
    }

    // 确认进入游戏
    onConfirmEnter() {
        if (!this.selectedPlayerId) return;
        
        // 将选中的 playerId 存入全局，方便游戏场景获取
        localStorage.setItem("current_player_id", this.selectedPlayerId);
        
        this.tipsLabel.string = "正在进入医馆...";
        director.loadScene("MainGameScene"); // 进入主游戏场景
    }

    onCloseCreatePanel() {
    this.createPanel.active = false;
    this.nicknameInput.string = "";
}
}