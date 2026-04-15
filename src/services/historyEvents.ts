import { EventEmitter } from 'events';

export const historyEmitter = new EventEmitter();
historyEmitter.setMaxListeners(500);

export function emitHistoryUpdate(accountId: string): void {
  historyEmitter.emit('update', accountId);
}