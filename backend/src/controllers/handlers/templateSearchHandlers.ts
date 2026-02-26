/**
 * Handlers for template search and autocomplete.
 */

import { Request, Response } from 'express';
import type { TemplateControllerServices } from '../types';

export async function searchTemplates(
  req: Request,
  res: Response,
  services: TemplateControllerServices
): Promise<void> {
  try {
    const { q, category, department, status, page = 1, limit = 10 } = req.query;

    console.log('Search request:', { q, category, department, status, page, limit });

    const searchResults = await services.elasticsearch.searchTemplates(q as string, {
      category: category as string,
      department: department as string,
      status: status as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    console.log('Elasticsearch results:', {
      took: searchResults.took,
      total: searchResults.total,
      hitsCount: searchResults.hits?.length || 0,
      totalType: typeof searchResults.total,
    });

    const totalNumber = Number(searchResults.total) || 0;
    const pageNumber = parseInt(page as string) || 1;
    const limitNumber = parseInt(limit as string) || 10;

    const response = {
      success: true,
      data: searchResults.hits || [],
      total: totalNumber,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(totalNumber / limitNumber),
      took: searchResults.took || 0,
    };

    console.log('Response prepared:', {
      success: response.success,
      total: response.total,
      dataLength: response.data.length,
      totalType: typeof response.total,
    });

    res.json(response);
  } catch (error: any) {
    console.error('Search error:', error.message);
    res.status(500).json({ success: false, error: error.message || 'Search failed' });
  }
}

export async function searchTemplatesEnhanced(
  req: Request,
  res: Response,
  services: TemplateControllerServices
): Promise<void> {
  try {
    const {
      q,
      category,
      department,
      status,
      tags,
      highlight = 'true',
      fuzzy = 'true',
      fields = 'name,description,tags',
    } = req.query;

    const searchFields = (fields as string).split(',').map((f) => f.trim());

    const results = await services.elasticsearch.searchTemplatesEnhanced(q as string, {
      category: category as string,
      department: department as string,
      status: status as string,
      tags: tags ? (tags as string).split(',').map((t) => t.trim()) : [],
      highlight: highlight === 'true',
      fuzzy: fuzzy === 'true',
      fields: searchFields,
    });

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function autocomplete(
  req: Request,
  res: Response,
  services: TemplateControllerServices
): Promise<void> {
  try {
    const { q, field = 'name' } = req.query;

    const results = await services.elasticsearch.autocomplete(
      q as string,
      field as 'name' | 'category' | 'tags'
    );

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
