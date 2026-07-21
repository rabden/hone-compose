export interface RegistryAction {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  version: string;
  author: string;
  tags: string[];
  path: string;
}

export interface Registry {
  schemaVersion: number;
  actions: RegistryAction[];
}
