import { _decorator, Component, Node, Vec3, input, Input, EventKeyboard, KeyCode, director, RigidBody2D, Vec2 } from 'cc';
import { NetManager } from './NetManager';
import { GlobalData } from './GlobalData';

const { ccclass, property } = _decorator;

@ccclass('PlayerController')
export class PlayerController extends Component {
    @property({ tooltip: '移动速度' })
    moveSpeed: number = 300;

    @property({ tooltip: '位置同步间隔(秒)' })
    syncInterval: number = 2;

    private _rb: RigidBody2D = null;
    private _syncTimer: number = 0;
    
    // 按键栈，用于实现“新指令优先”
    private _keyStack: KeyCode[] = []; 

    private playerId: string = "";
    private currentMapId: string = "clinic_interior";

    onLoad() {
        this._rb = this.getComponent(RigidBody2D);
        this.playerId = localStorage.getItem("current_player_id");

        // 注册键盘监听
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    private onKeyDown(event: EventKeyboard) {
        const code = event.keyCode;
        if (this.isMovementKey(code) && this._keyStack.indexOf(code) === -1) {
            this._keyStack.push(code);
        }
    }

    private onKeyUp(event: EventKeyboard) {
        const code = event.keyCode;
        const index = this._keyStack.indexOf(code);
        if (index !== -1) {
            this._keyStack.splice(index, 1);
        }
    }

    private isMovementKey(code: KeyCode): boolean {
        return code === KeyCode.KEY_W || code === KeyCode.KEY_S || 
               code === KeyCode.KEY_A || code === KeyCode.KEY_D ||
               code === KeyCode.ARROW_UP || code === KeyCode.ARROW_DOWN ||
               code === KeyCode.ARROW_LEFT || code === KeyCode.ARROW_RIGHT;
    }

    /**
     * 获取当前移动方向
     * 如果你想允许斜着走，这里可以返回叠加后的向量。
     * 现在的逻辑是“新按下的键优先”，只允许 4 方向移动，手感更像复古 RPG。
     */
    private getMoveVelocity(): Vec2 {
        if (this._keyStack.length === 0) return Vec2.ZERO;

        const lastKey = this._keyStack[this._keyStack.length - 1];
        let velocity = new Vec2(0, 0);

        switch (lastKey) {
            case KeyCode.KEY_W: case KeyCode.ARROW_UP: velocity.y = 1; break;
            case KeyCode.KEY_S: case KeyCode.ARROW_DOWN: velocity.y = -1; break;
            case KeyCode.KEY_A: case KeyCode.ARROW_LEFT: velocity.x = -1; break;
            case KeyCode.KEY_D: case KeyCode.ARROW_RIGHT: velocity.x = 1; break;
        }

        return velocity.multiplyScalar(this.moveSpeed);
    }

    public initPosition(pos: { x: number, y: number, mapId: string }) {
        this.currentMapId = pos.mapId || "clinic_interior";
        this.node.setPosition(new Vec3(pos.x, pos.y, 0));
    }

    update(dt: number) {
        if (!this._rb) return;

        // 1. 直接获取最新指令对应的速度
        const targetVelocity = this.getMoveVelocity();
        this._rb.linearVelocity = targetVelocity;

        // 2. 如果正在移动，更新 HUD 坐标
        if (!targetVelocity.equals(Vec2.ZERO)) {
            director.emit("UPDATE_COORDINATES", {
                mapId: this.currentMapId,
                x: this.node.position.x,
                y: this.node.position.y
            });
        }

        // 3. 定时同步位置
        this._syncTimer += dt;
        if (this._syncTimer >= this.syncInterval) {
            this.syncPositionToServer();
            this._syncTimer = 0;
        }
    }

    async syncPositionToServer() {
        if (!this.playerId) return;
        try {
            const res = await NetManager.getInstance().post("/player/position", {
                playerId: this.playerId,
                mapId: this.currentMapId,
                x: Math.round(this.node.position.x),
                y: Math.round(this.node.position.y)
            });
            GlobalData.playerData = res;
        } catch (e) { }
    }
}