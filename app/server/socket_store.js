import { createClient } from "redis";

export class SocketStore {
  constructor(app) {
    this.app = app;
    this.redisPresenceStore = createClient({
      url: this.app.config.redis.url
    });
    this.store = {};
  }

  async connect() {
    this.redisPresenceStore.on("error", (err) => this.app.logger.error(`Error with Redis: ${err}`));
    return await this.redisPresenceStore.connect();
  }

  key(userId, platformId) {
    return `${userId}_${platformId}`;
  }

  async add(userId, platformId, socket) {
    await this.redisPresenceStore.set(this.key(userId, platformId), new Date().toISOString());
    const id = this.key(userId, platformId);
    this.store[id] = this.store[id] || [];
    this.store[id].push(socket);
    return true;
  }

  get(userId, platformId) {
    return this.store[this.key(userId, platformId)];
  }

  async isPresent(userId, platformId) {
    const reply = await this.redisPresenceStore.exists(this.key(userId, platformId));
    return reply > 0;
  }

  async remove(userId, platformId, socket) {
    const userSockets = this.store[this.key(userId, platformId)];

    if (userSockets?.length > 1) {
      const index = userSockets.indexOf(socket);
      userSockets.splice(index, 1);
    } else {
      await this.redisPresenceStore.del(this.key(userId, platformId));
      delete this.store[this.key(userId, platformId)];
    }
  }
}
