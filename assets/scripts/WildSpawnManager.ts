import { _decorator, Component, Node, Prefab, SpriteFrame, instantiate, Vec3, UITransform, randomRangeInt, Vec2 } from 'cc';
import { HerbNode } from './HerbNode';
const { ccclass, property } = _decorator;

// 定义药材配置项
@ccclass('HerbConfigItem')
export class HerbConfigItem {
    @property({ tooltip: '药材ID，需与数据库一致' })
    itemId: string = "item_licorice"; 

    @property({ tooltip: '药材名称' })
    name: string = "甘草";   

    @property(SpriteFrame)
    icon: SpriteFrame = null!; // 对应的图片

    @property({ tooltip: '生成权重（概率），数字越大越容易出' })
    weight: number = 50; 
}

@ccclass('WildSpawnManager')
export class WildSpawnManager extends Component {

    @property({ type: Prefab, tooltip: '通用的药材预制体 (Herb_Generic)' })
    herbPrefab: Prefab = null!; 

    @property({ type: Node, tooltip: '生成区域节点 (只用它的大小决定范围，不挂载子节点)' })
    spawnArea: Node = null!; 

    @property({ type: Node, tooltip: '【关键】药材生成到哪个节点下？(通常拖入 Canvas 或 MapLayer)' })
    targetLayer: Node = null!;

    @property({ type: Node, tooltip: '【关键】主角节点 (用于生成药材后，强制把主角提到最上层)' })
    playerNode: Node = null!;

    @property([HerbConfigItem])
    spawnConfig: HerbConfigItem[] = []; // 配置药材列表

    @property({ tooltip: '最少生成数量' })
    minCount: number = 3;

    @property({ tooltip: '最多生成数量' })
    maxCount: number = 8;

    @property({ tooltip: '最小间距：防止药材重叠' })
    minSpacing: number = 150; 

    // 记录已生成的坐标，用于防重叠检测
    private spawnedPositions: Vec3[] = [];
    // 记录已生成的节点，用于清理
    private spawnedNodes: Node[] = [];

    onLoad() {
        // 每次场景加载都会触发
        this.spawnHerbs();
    }

    spawnHerbs() {
        if (!this.spawnArea || !this.herbPrefab) {
            console.error("WildSpawnManager: 请拖入 SpawnArea 和 HerbPrefab");
            return;
        }

        // 1. 清理旧药材 (如果场景没销毁，先清空上次生成的)
        this.spawnedNodes.forEach(node => {
            if (node && node.isValid) node.destroy();
        });
        this.spawnedNodes = [];
        this.spawnedPositions = [];

        // 2. 随机生成数量
        const count = randomRangeInt(this.minCount, this.maxCount);
        console.log(`[野外] 正在刷新药材，数量: ${count}`);

        // 3. 获取生成范围 (宽/高)
        const uiTransform = this.spawnArea.getComponent(UITransform);
        const width = uiTransform ? uiTransform.width : 1000;
        const height = uiTransform ? uiTransform.height : 1000;

        // 4. 循环生成
        for (let i = 0; i < count; i++) {
            this.createOneHerbSafe(width, height);
        }

        // 5. 【核心】强制调整层级：把主角提到最上面
        if (this.playerNode && this.playerNode.parent) {
            // setSiblingIndex 设为最大值，就在最上层
            const lastIndex = this.playerNode.parent.children.length - 1;
            this.playerNode.setSiblingIndex(lastIndex);
        }
    }

    createOneHerbSafe(areaW: number, areaH: number) {
        const config = this.getRandomConfig();
        if (!config) return;

        // --- A. 防重叠坐标计算 ---
        let pos = new Vec3();
        let isValid = false;
        let maxRetries = 10; // 尝试10次寻找空位

        while (maxRetries > 0) {
            // 随机坐标 (以区域中心为原点)
            const randX = (Math.random() - 0.5) * areaW;
            const randY = (Math.random() - 0.5) * areaH;
            
            // 检查距离
            let tooClose = false;
            for (const existingPos of this.spawnedPositions) {
                if (Vec3.distance(new Vec3(randX, randY, 0), existingPos) < this.minSpacing) {
                    tooClose = true;
                    break;
                }
            }

            if (!tooClose) {
                pos.set(randX, randY, 0);
                isValid = true;
                break;
            }
            maxRetries--;
        }

        if (!isValid) {
            // console.warn("位置太挤了，放弃生成一株药材");
            return; 
        }

        // --- B. 实例化药材 ---
        const node = instantiate(this.herbPrefab);
        
        // 【关键】挂载到 targetLayer (和主角同一层)，而不是 spawnArea
        if (this.targetLayer) {
            node.parent = this.targetLayer;
        } else {
            node.parent = this.spawnArea; // 降级方案
        }

        node.setPosition(pos);
        
        // 记录数据
        this.spawnedPositions.push(pos);
        this.spawnedNodes.push(node);

        // --- C. 初始化数据 ---
        const herbScript = node.getComponent(HerbNode);
        if (herbScript) {
            herbScript.initInfo(config.itemId, config.name, config.icon);
        }
    }

    /**
     * 权重随机算法
     */
    getRandomConfig() {
        if (this.spawnConfig.length === 0) return null;
        
        const totalWeight = this.spawnConfig.reduce((sum, item) => sum + item.weight, 0);
        let randomVal = Math.random() * totalWeight;

        for (const item of this.spawnConfig) {
            randomVal -= item.weight;
            if (randomVal <= 0) return item;
        }
        return this.spawnConfig[0];
    }
}