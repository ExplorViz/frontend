export interface FunctionDto {
  name: string;
  returnType: string;
  metrics: Record<string, number>;
}

export interface FieldDto {
  name: string;
  type: string;
}

export interface ClazzDto {
  name: string;
  type: string;
  metrics: Record<string, number>;
  functions: FunctionDto[];
  fields: FieldDto[];
  innerClasses: ClazzDto[];
}

export interface FileDetailedDto {
  name: string;
  language: string;
  packageName: string;
  addedLines: number;
  modifiedLines: number;
  deletedLines: number;
  metrics: Record<string, number>;
  classes: ClazzDto[];
  functions: FunctionDto[];
}
