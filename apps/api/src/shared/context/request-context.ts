import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContextData {
  requestId: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  route?: string;
  method?: string;
  startTime?: number;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContextData>();

export class RequestContext {
  static run<T>(data: RequestContextData, callback: () => T): T {
    return asyncLocalStorage.run(data, callback);
  }

  static get(): RequestContextData | undefined {
    return asyncLocalStorage.getStore();
  }

  static getRequestId(): string {
    return asyncLocalStorage.getStore()?.requestId ?? "req_system";
  }

  static getUserId(): string | undefined {
    return asyncLocalStorage.getStore()?.userId;
  }

  static setUserId(userId: string): void {
    const store = asyncLocalStorage.getStore();
    if (store) {
      store.userId = userId;
    }
  }
}
