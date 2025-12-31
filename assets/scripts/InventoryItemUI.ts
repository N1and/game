// assets/scripts/InventoryItemUI.ts
import { _decorator, Component, Label, Sprite, resources, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('InventoryItemUI')
export class InventoryItemUI extends Component {
    // 在这里直接引用组件，不需要再去 getChildByName 查找
    @property(Label) nameLabel: Label = null;
    @property(Label) descLabel: Label = null;
    @property(Label) countLabel: Label = null;
    @property(Sprite) iconSprite: Sprite = null;

    /**
     * 外部调用的初始化方法
     */
    init(itemData: any, info: any) {
        if (this.nameLabel) this.nameLabel.string = info ? info.name : "未知物品";
        if (this.descLabel) this.descLabel.string = info ? info.description : "暂无描述";
        if (this.countLabel) this.countLabel.string = "x" + itemData.count;

        // 加载图标
        if (info && info.iconRes && this.iconSprite) {
            resources.load(`icons/${info.iconRes}/spriteFrame`, SpriteFrame, (err, sf) => {
                if (!err && this.iconSprite) this.iconSprite.spriteFrame = sf;
            });
        }
    }
}