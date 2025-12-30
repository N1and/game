import { _decorator, Component, Node, EditBox, Label, EventHandler, director } from 'cc';
import { NetManager } from './NetManager'; // 确保路径正确
const { ccclass, property } = _decorator;

@ccclass('LoginManager')
export class LoginManager extends Component {
    @property(EditBox) accountEditBox: EditBox = null;
    @property(EditBox) passwordEditBox: EditBox = null;
    @property(Label) resultLabel: Label = null;

    start() {
        this.resultLabel.string = "欢迎来到古代医馆";
    }

    // 登录按钮回调
    async onLoginClick() {
        const username = this.accountEditBox.string;
        const password = this.passwordEditBox.string;

        if (!username || !password) {
            this.showTips("用户名或密码不能为空");
            return;
        }

        this.showTips("正在登录...");

        try {
            const res = await NetManager.getInstance().post("/auth/login", { username, password });
            
            // 保存 Token
            NetManager.getInstance().setToken(res.access_token);
            
            this.showTips("登录成功！准备进入...");

            
            // 1. 强制让输入框失去焦点（收起键盘/光标消失）
            if (this.accountEditBox) this.accountEditBox.blur();
            if (this.passwordEditBox) this.passwordEditBox.blur();

            // 2. 延迟 0.1 秒跳转，给引擎一点时间清理当前场景的渲染状态
            this.scheduleOnce(() => {
                director.loadScene("SelectSave");
            }, 0.1);

        } catch (err) {
            this.showTips("登录失败: " + (err.message || "网络异常"));
        }
    }

    // 注册按钮回调
    async onRegisterClick() {
        const username = this.accountEditBox.string;
        const password = this.passwordEditBox.string;

        this.showTips("正在注册...");

        try {
            await NetManager.getInstance().post("/auth/register", { username, password });
            this.showTips("注册成功，请点击登录");
        } catch (err) {
            this.showTips("注册失败: " + (err.message || "账号已存在"));
        }
    }

    private showTips(msg: string) {
        this.resultLabel.string = msg;
    }
}