import { _decorator, Component, Vec3, input, Input, EventKeyboard, KeyCode, director, RigidBody2D, Vec2 } from 'cc';
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
    private _inputDir: Vec3 = new Vec3(0, 0, 0);
    private _isMoving: boolean = false;
    private _syncTimer: number = 0;

    private playerId: string = "";
    private currentMapId: string = "clinic_interior";

    onLoad() {
        // 1. 获取物理组件
        this._rb = this.getComponent(RigidBody2D);
        if (!this._rb) {
            console.error("Player 节点缺少 RigidBody2D 组件！碰撞将失效。");
        }

        // 2. 获取玩家 ID
        this.playerId = localStorage.getItem("current_player_id");

        // 3. 注册键盘监听
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    onDestroy() {
        // 销毁时移除监听
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    /**
     * 由 HUDManager 调用，用于进游戏时的初始定位
     */
    public initPosition(pos: { x: number, y: number, mapId: string }) {
        this.currentMapId = pos.mapId || "clinic_interior";
        this.node.setPosition(new Vec3(pos.x, pos.y, 0));
        console.log(`[Player] 初始化位置成功: ${this.currentMapId}`);
    }

    private onKeyDown(event: EventKeyboard) {
        this.updateInputDir(event.keyCode, 1);
    }

    private onKeyUp(event: EventKeyboard) {
        this.updateInputDir(event.keyCode, 0);
    }

    /**
     * 更新输入方向
     */
    private updateInputDir(keyCode: KeyCode, state: number) {
        switch (keyCode) {
            case KeyCode.KEY_W:
            case KeyCode.ARROW_UP:
                this._inputDir.y = state;
                break;
            case KeyCode.KEY_S:
            case KeyCode.ARROW_DOWN:
                this._inputDir.y = -state;
                break;
            case KeyCode.KEY_A:
            case KeyCode.ARROW_LEFT:
                this._inputDir.x = -state;
                break;
            case KeyCode.KEY_D:
            case KeyCode.ARROW_RIGHT:
                this._inputDir.x = state;
                break;
        }

        // 判断当前是否有位移输入
        this._isMoving = this._inputDir.x !== 0 || this._inputDir.y !== 0;
    }

    update(dt: number) {
        // --- 1. 处理物理移动 ---
        if (this._rb) {
            if (this._isMoving) {
                // 归一化向量，防止斜向移动过快
                const moveVec = this._inputDir.clone().normalize();
                // 设置线性速度 (linearVelocity) 才能触发物理碰撞
                this._rb.linearVelocity = new Vec2(moveVec.x * this.moveSpeed, moveVec.y * this.moveSpeed);

                // 派发事件通知 HUD 更新坐标显示（仅更新文本，不发请求）
                director.emit("UPDATE_COORDINATES", {
                    mapId: this.currentMapId,
                    x: this.node.position.x,
                    y: this.node.position.y
                });
            } else {
                // 停止按键时，速度立即归零，防止滑行
                this._rb.linearVelocity = new Vec2(0, 0);
            }
        }

        // --- 2. 处理定时同步位置到服务器 ---
        this._syncTimer += dt;
        if (this._syncTimer >= this.syncInterval) {
            this.syncPositionToServer();
            this._syncTimer = 0;
        }
    }

    /**
     * 调用 POST /player/position 接口
     */
    async syncPositionToServer() {
        if (!this.playerId) return;

        try {
            const res = await NetManager.getInstance().post("/player/position", {
                playerId: this.playerId,
                mapId: this.currentMapId,
                x: Math.floor(this.node.position.x),
                y: Math.floor(this.node.position.y)
            });

            // 同步最新的全局玩家数据
            GlobalData.playerData = res;
            console.log("服务器坐标已同步");
        } catch (e) {
            console.warn("坐标同步失败，可能是网络问题", e);
        }
    }
}