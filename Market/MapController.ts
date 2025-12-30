import { _decorator, Component, director } from 'cc';
import { HttpManager } from './HttpManager';
import { GameGlobal } from './GameGlobal';
const { ccclass, property } = _decorator;

@ccclass('MapController')
export class MapController extends Component {

    // 绑定在“市场”建筑按钮的点击事件上
    public onMarketBuildingClick() {
        const reqData = {
            playerId: GameGlobal.playerId,
            targetMapId: "scene_market", // 假设市场的场景ID
            x: 0,
            y: 0
        };

        // 调用 /player/change-map 接口
        HttpManager.getInstance().post('/player/change-map', reqData, (res) => {
            // 这里假设后端返回成功状态
            console.log("场景切换成功，正在加载市场...");
            
            // Cocos 加载市场场景
            director.loadScene("MarketScene");
        });
    }
}