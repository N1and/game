import { _decorator, Component, Node, Collider2D, Contact2DType, Tween, Vec3, Sprite, SpriteFrame, UITransform, Label } from 'cc';
import { NetManager } from './NetManager';
import { GlobalData } from './GlobalData';
const { ccclass, property } = _decorator;

@ccclass('HerbNode')
export class HerbNode extends Component {

    public itemId: string = ""; 
    public herbName: string = "";

    // --- 修改：现在控制整个 UI 组 ---
    @property({ type: Node, tooltip: '拖入 UI_Group 节点' })
    uiGroup: Node = null!;

    // --- 新增：名字标签 ---
    @property({ type: Label, tooltip: '拖入 NameLabel 节点' })
    nameLabel: Label = null!;

    @property({ type: Sprite, tooltip: '拖入节点自身的 Sprite' })
    displaySprite: Sprite = null!; 

    private isGathering: boolean = false;

    initInfo(id: string, name: string, spriteFrame: SpriteFrame) {
        this.itemId = id;
        this.herbName = name;
        
        // 1. 设置图片和大小
        if (this.displaySprite && spriteFrame) {
            this.displaySprite.spriteFrame = spriteFrame;
            this.displaySprite.sizeMode = Sprite.SizeMode.CUSTOM; 
            const tf = this.node.getComponent(UITransform);
            if (tf) tf.setContentSize(60, 60);
        }

        // 2. 【新增】设置头顶的名字
        if (this.nameLabel) {
            this.nameLabel.string = name;
        }
    }

    start() {
        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
            collider.on(Contact2DType.END_CONTACT, this.onEndContact, this);
        }
        
        // 确保一开始隐藏
        if (this.uiGroup) this.uiGroup.active = false;
    }

    onBeginContact(self: Collider2D, other: Collider2D) {
        if (other.node.name === 'Player') {
            // 靠近显示整个 UI 组 (名字+按钮)
            if (this.uiGroup) this.uiGroup.active = true;
        }
    }

    onEndContact(self: Collider2D, other: Collider2D) {
        if (other.node.name === 'Player') {
            // 离开隐藏
            if (this.uiGroup) this.uiGroup.active = false;
        }
    }

    public async onGatherClick() {
        if (this.isGathering) return;
        this.isGathering = true; 

        console.log(`正在采集: ${this.herbName}`);

        try {
            const playerId = localStorage.getItem("current_player_id");
            if (!playerId) { 
                this.isGathering = false; 
                return; 
            }

            const res = await NetManager.getInstance().post("/player/gather", {
                playerId: playerId,
                itemId: this.itemId,
                count: 1 
            });

            if (res.success) {
                if (res.currentInventory && GlobalData.playerData) {
                    GlobalData.playerData.inventory = res.currentInventory;
                }
                this.playSuccessEffect();
            } else {
                console.warn("采集失败:", res.message);
                this.isGathering = false;
            }
        } catch (err) {
            console.error(err);
            this.isGathering = false;
        }
    }

    playSuccessEffect() {
        if (this.uiGroup) this.uiGroup.active = false;
        new Tween(this.node)
            .to(0.3, { scale: new Vec3(0, 0, 0) })
            .call(() => { this.node.destroy(); })
            .start();
    }
}