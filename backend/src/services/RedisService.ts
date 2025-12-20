import { createClient, RedisClientType } from 'redis';

export class RedisService {
  private client: RedisClientType;
  private isConnected: boolean = false;
  private connectionPromise: Promise<void> | null = null;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
        connectTimeout: 10000,
      }
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.client.on('connect', () => {
      console.log('🔄 Connecting to Redis...');
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      console.log('✅ Redis client connected and ready');
    });

    this.client.on('error', (err) => {
      console.error('❌ Redis client error:', err);
      this.isConnected = false;
    });

    this.client.on('disconnect', () => {
      console.log('🔴 Redis client disconnected');
      this.isConnected = false;
    });

    this.client.on('end', () => {
      console.log('🔴 Redis connection closed');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;

    if (!this.connectionPromise) {
      this.connectionPromise = this.client.connect()
        .then(() => {
          console.log('✅ Redis connected successfully');
        })
        .catch((error) => {
          console.error('❌ Failed to connect to Redis:', error);
          this.connectionPromise = null;
          throw error;
        });
    }

    return this.connectionPromise;
  }

  async ensureConnection(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      await this.ensureConnection();
      return await this.client.get(key);
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    try {
      const value = await this.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis getJson error:', error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    try {
      await this.ensureConnection();
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  }

  async setJson(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      const stringValue = JSON.stringify(value);
      return await this.set(key, stringValue, ttlSeconds);
    } catch (error) {
      console.error('Redis setJson error:', error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      await this.ensureConnection();
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      console.error('Redis delete error:', error);
      return false;
    }
  }

  async delPattern(pattern: string): Promise<number> {
    try {
      await this.ensureConnection();
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        const result = await this.client.del(keys);
        console.log(`🗑️ Deleted ${result} keys matching pattern: ${pattern}`);
        return result;
      }
      return 0;
    } catch (error) {
      console.error('Redis delete pattern error:', error);
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.ensureConnection();
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      await this.ensureConnection();
      return await this.client.expire(key, ttlSeconds);
    } catch (error) {
      console.error('Redis expire error:', error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      await this.ensureConnection();
      return await this.client.ttl(key);
    } catch (error) {
      console.error('Redis ttl error:', error);
      return -2; 
    }
  }

  async flushAll(): Promise<boolean> {
    try {
      await this.ensureConnection();
      await this.client.flushAll();
      console.log('🧹 Redis cache cleared');
      return true;
    } catch (error) {
      console.error('Redis flushAll error:', error);
      return false;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.ensureConnection();
      await this.client.ping();
      return true;
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      this.connectionPromise = null;
    }
  }
}

export const redisService = new RedisService();