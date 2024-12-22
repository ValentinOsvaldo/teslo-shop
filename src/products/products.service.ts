import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { validate as isUUID } from 'uuid';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { PaginationDto } from 'src/common/pagination.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger('ProductsService');

  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto) {
    try {
      const product = this.productRepository.create(createProductDto);

      await this.productRepository.save(product);

      return product;
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findAll({ page = 1, per_page = 5 }: PaginationDto) {
    try {
      const skip = (page - 1) * per_page;
      const [products, total] = await this.productRepository.findAndCount({
        take: per_page,
        skip: skip,
      });

      return {
        count: total,
        products,
      };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findOne(slug: string) {
    let product: Product;

    if (isUUID(slug)) {
      product = await this.productRepository.findOneBy({
        id: slug,
      });
    } else {
      const queryBuilder = this.productRepository.createQueryBuilder();

      product = await queryBuilder
        .where('LOWER(title) = LOWER(:title) or slug = :slug', {
          title: slug,
          slug,
        })
        .getOne();
    }

    if (!product) throw new NotFoundException(`Product with ${slug} not found`);

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    try {
      const product = await this.productRepository.preload({
        id: id,
        ...updateProductDto,
      });

      if (!product) throw new NotFoundException(`Product #${id} not found`);

      return this.productRepository.save(product);
    } catch (error) {
      console.error(error);
      this.handleExceptions(error);
    }
  }

  async remove(id: string) {
    try {
      const product = await this.findOne(id);

      await this.productRepository.remove(product);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  handleExceptions(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.detail);

    this.logger.error(error);
    throw new InternalServerErrorException();
  }
}
