import isObject from '../object-helpers';

export interface Metric {
    idk: string;        //idk means here I don't know, since Influx always transmitts one empty key-value pair that is catched by this dummy variable
    table: number;
    timestamp: Date; 
    value: number;
    name: string;
    description: string;
    landscapeToken: string;
    unit: string;
}

export function isMetric(x: any): x is Metric {
    return isObject(x) && "timestamp" in x;
}

export type MetricLandscapeData = Metric[];