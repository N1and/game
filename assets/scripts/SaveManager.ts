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

    @property(Button) deleteBtn: Button = null; 

    start() {
        this.createPanel.active = false;
        this.confirmBtn.interactable = false;
        this.refreshSaveList();
    }

    // 刷新列表逻辑微调：如果没有存档了，禁用按钮
    async refreshSaveList() {
        try {
            this.tipsLabel.string = "正在加载存档...";
            const saves = await NetManager.getInstance().get("/player/list-saves");
            
            this.currentSavesCount = saves.length;
            this.renderSaves(saves);
            
            this.tipsLabel.string = `已有存档: ${this.currentSavesCount}/6`;
            
            // 刷新后如果没有选中目标，确保按钮是灰的
            if (!this.selectedPlayerId) {
                this.confirmBtn.interactable = false;
                this.deleteBtn.interactable = false;
            }
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
        this.deleteBtn.interactable = true; // 点亮删除按钮
        
        // 高亮视觉反馈
        this.saveListLayout.children.forEach(child => {
            const sprite = child.getComponent(Sprite);
            if (sprite) sprite.color = Color.WHITE;
        });
        const selectedSprite = itemNode.getComponent(Sprite);
        if (selectedSprite) selectedSprite.color = Color.YELLOW; 
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
        this.scheduleOnce(() => {
            director.loadScene("MainGameScene", () => {
                console.log("主场景加载回调成功执行");
            });
        }, 0); 
    }

    onCloseCreatePanel() {
    this.createPanel.active = false;
    this.nicknameInput.string = "";
    }

    async onDeleteSelectedSave() {
        if (!this.selectedPlayerId) return;

        // 建议增加一个简单的二次确认（原生弹窗）
        // 如果之后你有漂亮的 UI 弹窗，可以替换掉这个
        const confirm = window.confirm("确定要永久删除这个存档吗？此操作不可撤销。");
        if (!confirm) return;

        this.tipsLabel.string = "正在删除...";
        this.deleteBtn.interactable = false; // 防止重复点击

        try {
            await NetManager.getInstance().post("/player/delete-save", { 
                playerId: this.selectedPlayerId 
            });
            
            this.tipsLabel.string = "存档已删除";
            
            // 关键：删除后重置选中状态
            this.selectedPlayerId = "";
            this.confirmBtn.interactable = false;
            this.deleteBtn.interactable = false;

            // 刷新列表
            await this.refreshSaveList(); 
            
        } catch (err) {
            console.error("删除失败:", err);
            this.tipsLabel.string = "删除失败: " + (err.message || "未知错误");
            this.deleteBtn.interactable = true;
        }
    }

}

