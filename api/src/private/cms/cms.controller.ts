import { Controller, Get, Param, Query, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

import { VerifyKey } from '../../auth/verify-key.decorator';

import { ArticleQueryDto } from './dto/article-query.dto';
import { CmsService } from './cms.service';
import type {
  ArticleSingleResponse,
  ArticlesListResponse,
  AuthorsListResponse,
  CategoriesListResponse,
  TagsListResponse,
} from './cms.types';

@Controller({ version: VERSION_NEUTRAL })
@ApiExcludeController()
@VerifyKey({ permissions: 'cms.read' })
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Get('articles')
  async listArticles(
    @Query() query: ArticleQueryDto,
  ): Promise<ArticlesListResponse> {
    return this.cmsService.listArticles(query);
  }

  @Get('articles/:identifier')
  async getArticle(
    @Param('identifier') identifier: string,
  ): Promise<ArticleSingleResponse> {
    const data = await this.cmsService.getArticle(identifier);
    return { data };
  }

  @Get('authors')
  async listAuthors(): Promise<AuthorsListResponse> {
    return this.cmsService.listAuthors();
  }

  @Get('categories')
  async listCategories(): Promise<CategoriesListResponse> {
    return this.cmsService.listCategories();
  }

  @Get('tags')
  async listTags(): Promise<TagsListResponse> {
    return this.cmsService.listTags();
  }
}
