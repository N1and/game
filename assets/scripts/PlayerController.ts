import { _decorator, Component, Node, Vec3, input, Input, EventKeyboard, KeyCode, director, RigidBody2D, Vec2, Animation } from 'cc';
import { NetManager } from './NetManager';
import { GlobalData } from './GlobalData';

const { ccclass, property } = _decorator;

// 定义方向枚举，方便管理
enum Direction {
    DOWN = 0,
    UP = 1,
    LEFT = 2,
    RIGHT = 3
}

@ccclass('PlayerController')
export class PlayerController extends Component {
    @property({ tooltip: '移动速度' })
    moveSpeed: number = 300;

    @property({ tooltip: '位置同步间隔(秒)' })
    syncInterval: number = 2;

    private _rb: RigidBody2D = null;
    private _anim: Animation = null; // 动画组件
    private _syncTimer: number = 0;
    
    private _keyStack: KeyCode[] = []; 
    private playerId: string = "";
    private currentMapId: string = "clinic_interior";

    // 记录当前朝向 (默认向下)
    private _currDir: Direction = Direction.DOWN;
    // 记录当前是否在移动
    private _isMoving: boolean = false;

    onLoad() {
        this._rb = this.getComponent(RigidBody2D);
        this._anim = this.getComponent(Animation); // 获取动画组件
        this.playerId = localStorage.getItem("current_player_id");

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
            this.updateState(); // 按下键时更新状态
        }
    }

    private onKeyUp(event: EventKeyboard) {
        const code = event.keyCode;
        const index = this._keyStack.indexOf(code);
        if (index !== -1) {
            this._keyStack.splice(index, 1);
            this.updateState(); // 松开键时更新状态
        }
    }

    private isMovementKey(code: KeyCode): boolean {
        return code === KeyCode.KEY_W || code === KeyCode.KEY_S || 
               code === KeyCode.KEY_A || code === KeyCode.KEY_D ||
               code === KeyCode.ARROW_UP || code === KeyCode.ARROW_DOWN ||
               code === KeyCode.ARROW_LEFT || code === KeyCode.ARROW_RIGHT;
    }

    /**
     * 核心逻辑：根据按键栈计算方向并播放动画
     */
    private updateState() {
        if (this._keyStack.length === 0) {
            // 停止移动
            if (this._isMoving) {
                this._isMoving = false;
                this.playAnim(false); // 播放待机动画
            }
            return;
        }

        // 正在移动
        const lastKey = this._keyStack[this._keyStack.length - 1];
        let newDir = this._currDir;

        // 判断新方向
        switch (lastKey) {
            case KeyCode.KEY_W: case KeyCode.ARROW_UP: newDir = Direction.UP; break;
            case KeyCode.KEY_S: case KeyCode.ARROW_DOWN: newDir = Direction.DOWN; break;
            case KeyCode.KEY_A: case KeyCode.ARROW_LEFT: newDir = Direction.LEFT; break;
            case KeyCode.KEY_D: case KeyCode.ARROW_RIGHT: newDir = Direction.RIGHT; break;
        }

        // 如果状态变了（从静止变移动，或者方向变了），就刷新动画
        if (!this._isMoving || newDir !== this._currDir) {
            this._currDir = newDir;
            this._isMoving = true;
            this.playAnim(true); // 播放走路动画
        }
    }

    /**
     * 播放对应的动画片段
     * @param isWalking true=走路, false=待机
     */
    private playAnim(isWalking: boolean) {
        if (!this._anim) return;

        let clipName = "";
        const dirName = this.getDirName(this._currDir); // "Up", "Down", "Left", "Right"

        if (isWalking) {
            clipName = `Walk_${dirName}`; // 例如 "Walk_Down"
        } else {
            clipName = `Idle_${dirName}`; // 例如 "Idle_Down"
        }

        // 防止重复播放同一个动画导致重头开始
        const state = this._anim.getState(clipName);
        if (state && state.isPlaying) return;

        this._anim.play(clipName);
    }

    private getDirName(dir: Direction): string {
        switch (dir) {
            case Direction.UP: return "Up";
            case Direction.DOWN: return "Down";
            case Direction.LEFT: return "Left";
            case Direction.RIGHT: return "Right";
        }
        return "Down";
    }

    private getMoveVelocity(): Vec2 {
        if (!this._isMoving) return Vec2.ZERO;

        let velocity = new Vec2(0, 0);
        switch (this._currDir) {
            case Direction.UP: velocity.y = 1; break;
            case Direction.DOWN: velocity.y = -1; break;
            case Direction.LEFT: velocity.x = -1; break;
            case Direction.RIGHT: velocity.x = 1; break;
        }
        return velocity.multiplyScalar(this.moveSpeed);
    }

    public initPosition(pos: { x: number, y: number, mapId: string }) {
        this.currentMapId = pos.mapId || "clinic_interior";
        this.node.setPosition(new Vec3(pos.x, pos.y, 0));
    }

    update(dt: number) {
        if (!this._rb) return;

        // 1. 设置速度
        const targetVelocity = this.getMoveVelocity();
        this._rb.linearVelocity = targetVelocity;

        // 2. 更新 HUD 坐标
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