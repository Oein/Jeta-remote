export type Instance = {
  info: {
    name: string;
    id: string;
  };
  config: {
    ram: number;
    jar: string;
    port: number;
    javaCommand?: string;
    javaArgs?: string;
    mcArgs?: string;
  };
};
