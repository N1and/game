import { _decorator, Component, Node, Collider2D, Contact2DType, input, Input, EventKeyboard, KeyCode, find, IPhysics2DContact } from 'cc';
import { MarketManager } from './MarketManager';

const { ccclass, property } = _decorator;

@ccclass('ShopNPC')
export class ShopNPC extends Component {
    @property({ tooltip: '商店ID，对应数据库里的店铺ID' })
    shopId: string = "village_market";

    @property({ type: Node, tooltip: '按F交互的提示图标/文字节点(可选)，默认隐藏' })
    tipNode: Node = null;

    // 内部状态
    private _isInRange: boolean = false; // 是否在交互范围内
    private _marketManager: MarketManager = null;

    onLoad() {
        // 1. 自动寻找场景里的 MarketManager
        // 假设你的商店面板节点路径是 Canvas/MarketPanel
        const panel = find("Canvas/MarketPanel");
        if (panel) {
            this._marketManager = panel.getComponent(MarketManager);
        } else {
            console.warn("ShopNPC: 未找到 MarketPanel，请检查节点路径");
        }

        // 2. 注册碰撞监听
        // 获取该节点上所有的碰撞器 (包含身体和感应圈)
        const colliders = this.getComponents(Collider2D);
        colliders.forEach(collider => {
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
            collider.on(Contact2DType.END_CONTACT, this.onEndContact, this);
        });

        // 3. 监听键盘按键
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);

        // 4. 初始化提示节点状态
        if (this.tipNode) this.tipNode.active = false;
    }

    onDestroy() {
        // 移除监听，防止报错
        const colliders = this.getComponents(Collider2D);
        colliders.forEach(collider => {
            collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
            collider.off(Contact2DType.END_CONTACT, this.onEndContact, this);
        });
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    /**
     * 碰撞开始
     */
    private onBeginContact(self: Collider2D, other: Collider2D, contact: IPhysics2DContact | null) {
        // 只检测主角
        if (other.node.name !== "Player") return;

        // 【关键】判断是哪个碰撞器触发的
        // Tag 1 = 我们在编辑器设置的“大范围感应圈”
        if (self.tag === 1) {
            this._isInRange = true;
            // console.log("进入商店范围，按 F 打开");
            
            // 显示头顶提示
            if (this.tipNode) this.tipNode.active = true;
        }
    }

    /**
     * 碰撞结束
     */
    private onEndContact(self: Collider2D, other: Collider2D, contact: IPhysics2DContact | null) {
        if (other.node.name !== "Player") return;

        // 如果离开的是感应圈 (Tag 1)
        if (self.tag === 1) {
            this._isInRange = false;
            // console.log("离开商店范围");

            // 隐藏头顶提示
            if (this.tipNode) this.tipNode.active = false;

            // 玩家走远了，自动关闭商店界面
            if (this._marketManager) this._marketManager.close();
        }
    }

    private onKeyDown(event: EventKeyboard) {
        // 1. 必须在交互范围内
        // 2. 必须按下 F 键
        if (this._isInRange && event.keyCode === KeyCode.KEY_F) {
            if (this._marketManager) {
                this._marketManager.openShop(null, this.shopId);
            }
        }
    }
}