import { _decorator, Component, Node, Collider2D, Contact2DType, input, Input, EventKeyboard, KeyCode, find } from 'cc';
import { MarketManager } from './MarketManager';

const { ccclass, property } = _decorator;

@ccclass('ShopNPC')
export class ShopNPC extends Component {
    @property({ tooltip: '商店ID' })
    shopId: string = "village_market";

    private _isTouching: boolean = false; // 记录是否正在碰撞接触中
    private _marketManager: MarketManager = null;

    onLoad() {
        // 1. 寻找 MarketManager
        const panel = find("Canvas/MarketPanel");
        if (panel) {
            this._marketManager = panel.getComponent(MarketManager);
        }

        // 2. 注册碰撞监听
        const collider = this.getComponent(Collider2D);
        if (collider) {
            // 注意：因为不是 Sensor，必须确保 Player 和 NPC 都有 RigidBody2D 才能触发碰撞回调
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
            collider.on(Contact2DType.END_CONTACT, this.onEndContact, this);
        }

        // 3. 监听键盘
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    private onBeginContact(self: Collider2D, other: Collider2D) {
        if (other.node.name === "Player") {
            this._isTouching = true;
            console.log("接触到商人，可以按 F 交互");
        }
    }

    private onEndContact(self: Collider2D, other: Collider2D) {
        if (other.node.name === "Player") {
            this._isTouching = false;
            console.log("离开商人");
            if (this._marketManager) this._marketManager.close();
        }
    }

    private onKeyDown(event: EventKeyboard) {
        // 只有在碰撞接触中按下 F 键才生效
        if (event.keyCode === KeyCode.KEY_F && this._isTouching) {
            if (this._marketManager) {
                this._marketManager.openShop(null, this.shopId);
            }
        }
    }
}