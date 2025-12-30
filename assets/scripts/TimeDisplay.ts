import { _decorator, Component, Label } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('TimeDisplay')
export class TimeDisplay extends Component {

    @property(Label)
    timeLabel: Label = null!; 
    update(dt: number) {
        const now = new Date(); 

        const h = now.getHours();
        const m = now.getMinutes();
        const s = now.getSeconds();

        let hours: string | number = h;
        if (h < 10) hours = "0" + h;

        let minutes: string | number = m;
        if (m < 10) minutes = "0" + m;

        let seconds: string | number = s;
        if (s < 10) seconds = "0" + s;

        if (this.timeLabel) {
            this.timeLabel.string = hours + ":" + minutes + ":" + seconds;
        }
    }
}