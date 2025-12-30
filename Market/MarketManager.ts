import { _decorator, Component, Node, Label, Prefab, instantiate, randomRange, EditBox } from 'cc';
import { HttpManager } from './HttpManager';
import { GameGlobal } from './GameGlobal';
const { ccclass, property } = _decorator;

@ccclass('MarketManager')
export class MarketManager extends Component {

    @property(Node)
    itemsContainer: Node = null!; // ScrollView的Content节点

    @property(Prefab)
    itemPrefab: Prefab = null!; // 药材摊位预制体

    @property(Node)
    buyDialog: Node = null!; // 购买确认弹窗（包含输入框和确认按钮）

    @property(Node)
    eventDialog: Node = null!; // 随机事件弹窗

    @property(Label)
    eventLabel: Label = null!; // 事件文本

    // 当前选中的药材数据
    private currentSelectedItem: any = null;

    start() {
        this.initMarketStalls();
        this.checkRandomEvent();
    }

    // 1. 初始化药材摊位
    initMarketStalls() {
        // 遍历配置生成摊位
        GameGlobal.herbConfig.forEach(herb => {
            const node = instantiate(this.itemPrefab);
            node.parent = this.itemsContainer;
            
            // 假设预制体里有对应的脚本或组件来设置显示
            // 这里简单用getChildByName获取节点设置文本
            node.getChildByName("NameLabel").getComponent(Label).string = herb.name;
            node.getChildByName("PriceLabel").getComponent(Label).string = `${herb.price}文`;
            
            // 绑定购买点击事件
            node.on(Node.EventType.TOUCH_END, () => {
                this.openBuyDialog(herb);
            });
        });
    }

    // 2. 打开购买弹窗
    openBuyDialog(herb: any) {
        this.currentSelectedItem = herb;
        this.buyDialog.active = true;
        // 更新弹窗UI显示药材名字等...
    }

    // 3. 确认购买（绑定在弹窗的“确定”按钮上）
    // 需要绑定输入框 EditBox 获取数量
    public onConfirmBuy() {
        if (!this.currentSelectedItem) return;

        // 获取输入框数量（假设输入框节点叫EditBox）
        const countStr = this.buyDialog.getChildByName("EditBox").getComponent(EditBox).string;
        const count = parseInt(countStr);

        if (isNaN(count) || count <= 0) {
            console.log("请输入有效的购买数量");
            return;
        }

        // 构造API数据
        const reqData = {
            playerId: GameGlobal.playerId,
            itemId: this.currentSelectedItem.id,
            count: count
        };

        // 调用 /market/buy 接口
        HttpManager.getInstance().post('/market/buy', reqData, (res) => {
            console.log("购买成功", res);
            this.buyDialog.active = false;
            
            // TODO: 在这里播放获得金币/物品的动画，或者更新背包UI
            alert(`成功购买 ${count} 个 ${this.currentSelectedItem.name}`);
        }, (err) => {
            console.error("购买失败，可能是钱不够", err);
        });
    }

    // 4. 随机事件逻辑
    checkRandomEvent() {
        // 30% 概率触发随机事件
        if (Math.random() < 0.3) {
            this.triggerEvent();
        }
    }

    triggerEvent() {
        const events = [
            "听说甘草最近要涨价了！",
            "有个神秘小贩在兜售新药方...",
            "路边有个病人晕倒了，是否救治？"
        ];
        
        const randomIdx = Math.floor(randomRange(0, events.length));
        const eventText = events[randomIdx];

        this.eventDialog.active = true;
        this.eventLabel.string = eventText;
    }

    // 绑定在随机事件弹窗的关闭/处理按钮
    public closeEventDialog() {
        this.eventDialog.active = false;
    }
    
    // 返回医馆（切换场景）
    public onBackToClinic() {
         const reqData = {
            playerId: GameGlobal.playerId,
            targetMapId: "scene_clinic", 
            x: 0, y: 0
        };
        HttpManager.getInstance().post('/player/change-map', reqData, (res) => {
            director.loadScene("ClinicScene");
        });
    }
}