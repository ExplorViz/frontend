import isObject from '../object-helpers';

export interface Metric {
    idk: string;        //der wert ist in Postman stets leer ist, das ist also quasi ein Lückenfüller
    table: number;
    timestamp: Date; 
    value: number;
    name: string;
    landscapeToken: string;
    unit: string;
}

export function isMetric(x: any): x is Metric {
    return isObject(x) && "timestamp" in x;
}

export type MetricLandscapeData = Metric[];