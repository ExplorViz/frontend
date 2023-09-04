import Service from '@ember/service';

export default class PerformanceLogger extends Service.extend({
  }) {

    private DELAY_OF_PERF_LOGS: number = 180000;

    private timers: Map<number, number> = new Map();

    private nextId: number = 0;

    private executionTimes: number[] = [];

    private executionTimesVr: number[] = [];

    init() {
        super.init();

        this.logPerformance();
    }

    private nextTimerId(): number {
        return ++this.nextId;
    }

    start(): number {
        var timerId = this.nextTimerId();
        this.timers.set(timerId, performance.now());
        return timerId;
    }

    stop(timerId: number, isVrMessage: boolean = false) {
        if (this.timers.has(timerId)) {
            const timestamp = this.timers.get(timerId);
            const stopTime = performance.now();
            if (timestamp) {
                const time = stopTime - timestamp;
                if (isVrMessage) {
                    this.executionTimesVr.push(time);
                } else {
                    this.executionTimes.push(time);
                }
            }
        }
    }

    async logPerformance() {
        console.log("Log Performance")
        while(true) {
            await this.sleep(this.DELAY_OF_PERF_LOGS);

            const executionTimesCopy = [...this.executionTimes];
            if (executionTimesCopy.length > 0) {
                const averageExecutionTime = executionTimesCopy.reduce((partialSum, a) => partialSum + a, 0) / executionTimesCopy.length
                console.log("Execution Time: " + averageExecutionTime + " ms");
            }

            const executionTimesVrCopy = [...this.executionTimesVr];
            if (executionTimesVrCopy.length > 0) {
                const averageExecutionTimeVr = executionTimesVrCopy.reduce((partialSum, a) => partialSum + a, 0) / executionTimesVrCopy.length
                console.log("VR Execution Time: " + averageExecutionTimeVr + " ms");
            }
            

        }
    }

    sleep(ms: number) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

  }