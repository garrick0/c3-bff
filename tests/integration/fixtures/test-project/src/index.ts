/**
 * Test Project - Entry Point
 */

import { UserService } from './services/UserService.js';
import { DataStore } from './data/DataStore.js';

export class Application {
  private userService: UserService;
  private dataStore: DataStore;

  constructor() {
    this.dataStore = new DataStore();
    this.userService = new UserService(this.dataStore);
  }

  async start() {
    console.log('Application started');
  }

  async stop() {
    console.log('Application stopped');
  }
}


