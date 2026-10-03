import { createClient } from "redis";

export class SocketStore {
  constructor(app) {
    this.app = app;
    this.redisPresenceStore = createClient({
      url: this.app.config.redis.url
    });
    this.presenceTtlSeconds = this.app.config.redis.presenceTtlSeconds;
    this.store = {};
  }

  async connect() {
    this.redisPresenceStore.on("error", (err) => this.app.logger.err(`Error with Redis: ${err}`));
    const connection = await this.redisPresenceStore.connect();
    this.presenceRefreshInterval = setInterval(() => this.refreshPresences(), this.presenceTtlSeconds * 1000 / 3);
    return connection;
  }

  stop() {
    clearInterval(this.presenceRefreshInterval);
  }

  key(userId, platformId) {
    return `${userId}_${platformId}`;
  }

  async add(userId, platformId, socket) {
    await this.redisPresenceStore.set(this.key(userId, platformId), new Date().toISOString(), { EX: this.presenceTtlSeconds });
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

  async refreshPresences() {
    try {
      await Promise.all(Object.keys(this.store).map((key) => this.redisPresenceStore.expire(key, this.presenceTtlSeconds)));
    } catch (error) {
      this.app.logger.err(`Unable to refresh presences: ${error}`);
    }
  }

  async remove(userId, platformId, socket) {
    const id = this.key(userId, platformId);
    const remainingSockets = (this.store[id] || []).filter((userSocket) => userSocket !== socket);

    if (remainingSockets.length > 0) {
      this.store[id] = remainingSockets;
    } else {
      await this.redisPresenceStore.del(id);
      delete this.store[id];
    }
  }
}
