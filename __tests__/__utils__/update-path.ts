import { normalize } from 'upath';

export function updatePaths<T extends { filePath: string }>(path: string, data: T[]): T[] {
  data.forEach((d) => (d.filePath = normalize(d.filePath.replace('{{path}}', path))));

  return data;
}

export function updatePath<T extends { filePath: string }>(path: string, data: T): T {
  const newData = { ...data };

  newData.filePath = normalize(newData.filePath.replace('{{path}}', path));

  return newData;
}
