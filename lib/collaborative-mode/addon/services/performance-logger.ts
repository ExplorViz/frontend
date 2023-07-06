import Service from '@ember/service';

export default class PerformanceLogger extends Service.extend({
  }) {

    private timers: Map<number, number> = new Map();

    private counter: number = 0;

    init() {
        super.init();
    }

    private nextTimerId(): number {
        return ++this.counter;
    }

    start(): number {
        var timerId = this.nextTimerId();
        this.timers.set(timerId, performance.now());
        return timerId;
    }

    stop(timerId: number) {
        if (this.timers.has(timerId)) {
            var timestamp = this.timers.get(timerId);
            if (timestamp) console.log("Execution Time: " + ( performance.now() - timestamp));
        }
    }


  }