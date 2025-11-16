/**
 * Test Project - User Service
 */

import { DataStore } from '../data/DataStore.js';
import type { User } from '../types.js';

export class UserService {
  constructor(private dataStore: DataStore) {}

  async getUser(id: string): Promise<User | null> {
    return this.dataStore.getUser(id);
  }

  async createUser(user: User): Promise<User> {
    return this.dataStore.saveUser(user);
  }
}


