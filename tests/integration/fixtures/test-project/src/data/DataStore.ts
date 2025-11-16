/**
 * Test Project - Data Store
 */

import type { User } from '../types.js';

export class DataStore {
  private users = new Map<string, User>();

  async getUser(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async saveUser(user: User): Promise<User> {
    this.users.set(user.id, user);
    return user;
  }
}


