// assets/scripts/BackpackManager.ts
import { _decorator, Component, Node, Prefab, instantiate, Label, Sprite, resources, SpriteFrame } from 'cc';
import { NetManager } from './NetManager';
import { GlobalData } from './GlobalData';
const { ccclass, property } = _decorator;

@ccclass('BackpackManager')
export class BackpackManager extends Component {
    @property(Node) content: Node = null;      // ScrollView 的 content
    @property(Prefab) itemPrefab: Prefab = null; // 刚才做的长条预制体

    /**
     * 当组件启用时（active 从 false 变为 true）自动执行
     */
    async onEnable() {
        console.log("背包面板已启用，开始刷新数据...");
        await this.refreshBackpack();
    }

    /**
     * 【补充】显示面板
     * 绑定到主界面“背包按钮”的 Click Event
     */
    show() {
        this.node.active = true;
        // 注意：这里不需要手动调用 refreshBackpack，因为 active = true 会触发 onEnable
    }

    /**
     * 【补充】关闭面板
     * 绑定到背包界面内“关闭按钮”的 Click Event
     */
    close() {
        this.node.active = false;
    }

    /**
     * 刷新背包列表
     */
    async refreshBackpack() {
        if (!this.content) return;
        
        // 渲染前清空旧条目
        this.content.removeAllChildren();

        // 1. 获取存档中的背包数组
        if (!GlobalData.playerData || !GlobalData.playerData.inventory) {
            console.warn("暂无存档数据");
            return;
        }

        const inventory = GlobalData.playerData.inventory;
        if (inventory.length === 0) {
            console.log("背包是空的");
            return;
        }

        // 2. 准备并行请求（如果缓存没有则请求后端）
        const promises = inventory.map(async (itemData) => {
            let info = GlobalData.getItemFromCache(itemData.itemId);
            if (!info) {
                try {
                    info = await NetManager.getInstance().get(`/item/${itemData.itemId}`);
                    GlobalData.saveItemToCache(itemData.itemId, info);
                } catch (e) { 
                    console.error("获取物品详情失败:", itemData.itemId); 
                }
            }
            return { itemData, info };
        });

        const results = await Promise.all(promises);

        // 3. 渲染列表
        results.forEach(res => {
            this.createListItem(res.itemData, res.info);
        });
    }

    /**
     * 实例化长条条目
     */
    private createListItem(itemData: any, info: any) {
        if (!this.itemPrefab) return;

        const itemNode = instantiate(this.itemPrefab);
        itemNode.parent = this.content;

        // 设置名称
        const nameNode = itemNode.getChildByName("NameLabel");
        if (nameNode) nameNode.getComponent(Label).string = info ? info.name : "未知物品";

        // 设置描述
        const descNode = itemNode.getChildByName("DescLabel");
        if (descNode) descNode.getComponent(Label).string = info ? info.description : "暂无描述";

        // 设置数量
        const countNode = itemNode.getChildByName("CountLabel");
        if (countNode) countNode.getComponent(Label).string = "x" + itemData.count;

        // 设置图标
        if (info && info.iconRes) {
            const iconNode = itemNode.getChildByPath("Icon");
            if (iconNode) {
                const iconSprite = iconNode.getComponent(Sprite);
                resources.load(`icons/${info.iconRes}/spriteFrame`, SpriteFrame, (err, sf) => {
                    if (!err && iconSprite) iconSprite.spriteFrame = sf;
                });
            }
        }
    }
}