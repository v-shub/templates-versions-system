import { Client, errors } from '@elastic/elasticsearch';
import * as dotenv from 'dotenv';

dotenv.config();

export class ElasticsearchService {
  private client: Client;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  constructor() {
    console.log('Initializing Elasticsearch client...');
    console.log('URL:', process.env.ELASTICSEARCH_URL);
    console.log('Username:', process.env.ELASTICSEARCH_USERNAME);
    
    this.client = new Client({
      node: process.env.ELASTICSEARCH_URL || 'https://localhost:9200',
      auth: {
        username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
        password: process.env.ELASTICSEARCH_PASSWORD || 'x-cnluF0oZujWoDZMAU-'
      },
      tls: {
        rejectUnauthorized: false
      },
      maxRetries: this.maxRetries,
      requestTimeout: 30000,
      sniffOnStart: true
    });

    console.log('Elasticsearch client initialized');
  }
  private async executeWithRetry(operation: () => Promise<any>, operationName: string): Promise<any> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        // Сохраняем ошибку с правильным типом
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Логируем ошибку
        console.warn(`Elasticsearch ${operationName} attempt ${attempt} failed:`, lastError.message);
        
        // Проверяем, стоит ли повторять
        if (this.shouldRetry(error) && attempt < this.maxRetries) {
          const delay = this.retryDelay * attempt;
          console.log(`Retrying ${operationName} in ${delay}ms...`);
          await this.delay(delay);
          continue;
        }
        
        break;
      }
    }
    
    // Используем lastError с проверкой на null
    const errorMessage = lastError ? lastError.message : 'Unknown error';
    throw new Error(`Elasticsearch ${operationName} failed after ${this.maxRetries} attempts: ${errorMessage}`);
  }

  private shouldRetry(error: any): boolean {
    // Повторяем для временных ошибок
    if (error instanceof errors.ConnectionError ||
        error instanceof errors.TimeoutError ||
        error instanceof errors.NoLivingConnectionsError) {
      return true;
    }
    
    // Проверяем ResponseError с кодом статуса
    if (error instanceof errors.ResponseError) {
      const statusCode = error.statusCode;
      return statusCode === 429 || (statusCode !== undefined && statusCode >= 500);
    }
    
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async indexTemplate(template: any) {
    return this.executeWithRetry(async () => {
      await this.client.index({
        index: 'templates',
        id: template._id.toString(),
        document: {
          name: template.name,
          description: template.description,
          category: template.category,
          department: template.department,
          tags: template.tags,
          status: template.metadata.status,
          author: template.metadata.author,
          lastModified: template.metadata.lastModified,
          content: `${template.name} ${template.description} ${template.tags.join(' ')}`
        },
        refresh: true // Ждем обновления индекса
      });
    }, 'indexTemplate');
  }

  async updateTemplate(template: any) {
    return this.executeWithRetry(async () => {
      await this.client.update({
        index: 'templates',
        id: template._id.toString(),
        doc: {
          name: template.name,
          description: template.description,
          category: template.category,
          department: template.department,
          tags: template.tags,
          status: template.metadata.status,
          author: template.metadata.author,
          lastModified: template.metadata.lastModified,
          content: `${template.name} ${template.description} ${template.tags.join(' ')}`
        },
        refresh: true
      });
    }, 'updateTemplate');
  }

  async deleteTemplate(templateId: string) {
    return this.executeWithRetry(async () => {
      try {
        await this.client.delete({
          index: 'templates',
          id: templateId
        });
      } catch (error) {
        // Игнорируем ошибку "не найден", так как документ уже удален
        if (error instanceof errors.ResponseError && error.statusCode === 404) {
          console.log(`Template ${templateId} not found in Elasticsearch, skipping delete`);
          return;
        }
        throw error;
      }
    }, 'deleteTemplate');
  }

  async searchTemplates(query: string, filters: any = {}) {
  return this.executeWithRetry(async () => {
    console.log('Elasticsearch search called:', { 
      query, 
      filters,
      timestamp: new Date().toISOString() 
    });
    
    if (!query || query.trim() === '') {
      throw new Error('Query parameter "q" is required');
    }

    const must: any[] = [];
    
    if (query === '*') {
      must.push({ match_all: {} });
    } else {
      must.push({
        multi_match: {
          query: query.trim(),
          fields: ['name^3', 'description^2', 'tags', 'content'],
          fuzziness: 'AUTO',
          operator: 'or'
        }
      });
    }

    const filter: any[] = [];
    if (filters.category && filters.category !== 'undefined') {
      filter.push({ term: { category: filters.category } });
    }
    if (filters.department && filters.department !== 'undefined') {
      filter.push({ term: { department: filters.department } });
    }
    if (filters.status && filters.status !== 'undefined') {
      filter.push({ term: { status: filters.status } });
    }

    const from = filters.page && filters.limit ? 
      (parseInt(filters.page) - 1) * parseInt(filters.limit) : 0;
    const size = filters.limit || 10;

    const result = await this.client.search({
      index: 'templates',
      query: {
        bool: {
          must,
          filter
        }
      },
      from,
      size,
      sort: [
        { _score: { order: 'desc' } },
        { lastModified: { order: 'desc' } }
      ]
    });

    // Преобразуем объект total в число
    const totalObject = result.hits.total;
    const totalValue = typeof totalObject === 'object' && totalObject !== null 
      ? totalObject.value 
      : typeof totalObject === 'number'
        ? totalObject
        : 0;

    console.log('Elasticsearch response:', {
      took: result.took,
      total: totalValue,
      hitsCount: result.hits.hits.length,
      totalType: typeof result.hits.total,
      totalRaw: result.hits.total
    });

    return {
      total: totalValue, 
      hits: result.hits.hits.map((hit: any) => ({
        ...hit._source,
        id: hit._id,
        score: hit._score
      })),
      took: result.took,
      _shards: result._shards
    };
  }, 'searchTemplates');
}

  // Новый метод для проверки "жизни" Elasticsearch
  async healthCheck(): Promise<boolean> {
    try {
      const health = await this.client.cluster.health();
      console.log('Elasticsearch cluster status:', health.status);
      return health.status !== 'red';
    } catch (error) {
      console.error('Elasticsearch health check failed:', error);
      return false;
    }
  }

  async autocomplete(query: string, field: 'name' | 'category' | 'tags') {
  return this.executeWithRetry(async () => {
    // Определяем базовое поле для поиска и агрегаций
    const searchField = field;
    const aggregationField = field === 'name' ? 'name.keyword' : field;
    
    const result = await this.client.search({
      index: 'templates',
      query: {
        bool: {
          should: [
            {
              match_phrase_prefix: {
                [searchField]: {
                  query,
                  slop: 10,
                  max_expansions: 10
                }
              }
            },
            {
              wildcard: {
                [aggregationField]: {
                  value: `*${query}*`,
                  boost: 0.5
                }
              }
            }
          ]
        }
      },
      aggs: {
        suggestions: {
          terms: {
            field: aggregationField,
            size: 10
          }
        }
      },
      size: 0
    });

    const aggregations = result.aggregations as Record<string, any>;
    const suggestionsAgg = aggregations?.suggestions as { buckets: Array<{ key: string }> };
    
    const suggestions = suggestionsAgg?.buckets || [];
    return suggestions.map(bucket => bucket.key);
  }, 'autocomplete');
}

// И метод расширенного поиска:
async searchTemplatesEnhanced(query: string, options: {
  category?: string;
  department?: string;
  status?: string;
  tags?: string[];
  highlight?: boolean;
  fuzzy?: boolean;
  fields?: string[];
}) {
  return this.executeWithRetry(async () => {
    const must: any[] = [];

    if (options.fuzzy) {
      must.push({
        multi_match: {
          query,
          fields: options.fields || ['name^3', 'description^2', 'tags', 'content'],
          fuzziness: 'AUTO',
          operator: 'or'
        }
      });
    } else {
      must.push({
        multi_match: {
          query,
          fields: options.fields || ['name^3', 'description^2', 'tags', 'content'],
          operator: 'and'
        }
      });
    }

    // Фильтры
    const filter: any[] = [];
    if (options.category) {
      filter.push({ term: { category: options.category } });
    }
    if (options.department) {
      filter.push({ term: { department: options.department } });
    }
    if (options.status) {
      filter.push({ term: { status: options.status } });
    }
    if (options.tags && options.tags.length > 0) {
      filter.push({ terms: { tags: options.tags } });
    }

    // Исправленная конфигурация highlight
    let highlightConfig: any = undefined;
    if (options.highlight) {
      highlightConfig = {
        fields: {
          name: { 
            fragment_size: 150, 
            number_of_fragments: 1 
          },
          description: { 
            fragment_size: 200, 
            number_of_fragments: 2 
          },
          content: { 
            fragment_size: 150, 
            number_of_fragments: 1 
          }
        },
        pre_tags: ['<mark>'],
        post_tags: ['</mark>'],
        encoder: 'html' as const 
      };
    }

    const result = await this.client.search({
      index: 'templates',
      query: {
        bool: {
          must,
          filter
        }
      },
      highlight: highlightConfig,
      sort: [
        { _score: { order: 'desc' } },
        { lastModified: { order: 'desc' } }
      ],
      size: 100
    });

    return {
      total: (result.hits.total as any)?.value || result.hits.total,
      hits: result.hits.hits.map((hit: any) => ({
        ...hit._source,
        id: hit._id,
        highlight: hit.highlight
      }))
    };
  }, 'searchTemplatesEnhanced');
}

  // Новый метод для создания индекса с настройками
  async createIndexIfNotExists() {
  try {
    const indexExists = await this.client.indices.exists({ index: 'templates' });
    
    if (!indexExists) {
      await this.client.indices.create({
        index: 'templates',
        body: {
          mappings: {
            properties: {
              // name с multi-field
              name: { 
                type: 'text',
                analyzer: 'standard',
                fields: {
                  keyword: {
                    type: 'keyword',
                    ignore_above: 256
                  }
                }
              },
              // description с multi-field
              description: { 
                type: 'text',
                analyzer: 'standard',
                fields: {
                  keyword: {
                    type: 'keyword',
                    ignore_above: 256
                  }
                }
              },
              category: { type: 'keyword' },
              department: { type: 'keyword' },
              tags: { type: 'keyword' },
              status: { type: 'keyword' },
              author: { type: 'keyword' },
              lastModified: { type: 'date' },
              content: { type: 'text', analyzer: 'standard' }
            }
          },
          settings: {
            number_of_shards: 1,
            number_of_replicas: 1
          }
        }
      });
      console.log('✅ Elasticsearch index "templates" created with proper mapping');
    } else {
      console.log('ℹ️ Elasticsearch index "templates" already exists');
    }
  } catch (error: any) {
    console.error('❌ Error creating Elasticsearch index:', error.message);
    throw error;
  }
}

async updateIndexMapping() {
  try {
    await this.client.indices.putMapping({
      index: 'templates',
      body: {
        properties: {
          name: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                ignore_above: 256
              }
            }
          },
          description: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                ignore_above: 256
              }
            }
          }
        }
      }
    });
    console.log('Index mapping updated');
  } catch (error) {
    console.error('Error updating mapping:', error);
  }
}

}