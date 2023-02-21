import fetch from "node-fetch";

export class PlatformStore {
  constructor(app) {
    this.app = app;
    this.store = {};
    this.logger = app.logger;
  }

  async get(id) {
    if (this.store[id]) {
      return this.store[id];
    } else {
      const platform = await this._fetchPlatform(id);
      const attributes = platform.data.attributes;
      this._add(platform.data.id, attributes);
      return this.store[id];
    }
  }

  _add(id, attributes) {
    this.store[id] = attributes;
    this.logger.info(`Platform ${id} added.`);
  }

  async _fetchPlatform(platformId) {
    const url = `http://${this.app.config.engine.host}:${this.app.config.engine.port}/internal/platforms/${platformId}`;
    const response = await fetch(url);
    if (response.status >= 400) {
      throw new Error(`Engine responded with code: ${response.status}`);
    } else {
      const json = await response.json();
      return json;
    }
  }
}
