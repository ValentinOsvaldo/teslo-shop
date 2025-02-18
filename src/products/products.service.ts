import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { validate as isUUID } from 'uuid';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { PaginationDto } from 'src/common/pagination.dto';
import { ProductImage } from './entities';
import { User } from 'src/auth/entities/user.entity';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger('ProductsService');

  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private productImageRepository: Repository<ProductImage>,

    private readonly dataSource: DataSource,
  ) {}

  async create(createProductDto: CreateProductDto, user: User) {
    try {
      const { images = [], ...productDetails } = createProductDto;

      const product = this.productRepository.create({
        ...productDetails,
        images: images.map((image) =>
          this.productImageRepository.create({ url: image }),
        ),
        user,
      });

      await this.productRepository.save(product);

      return { ...product, images };
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
        relations: {
          images: true,
        },
      });

      return {
        count: total,
        products: products.map((product) => ({
          ...product,
          images: product.images.map((image) => image.url),
        })),
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
      const queryBuilder = this.productRepository.createQueryBuilder('prod');

      product = await queryBuilder
        .where('LOWER(title) = LOWER(:title) or slug = :slug', {
          title: slug,
          slug,
        })
        .leftJoinAndSelect('prod.images', 'prodImages')
        .getOne();
    }

    if (!product) throw new NotFoundException(`Product with ${slug} not found`);

    return product;
  }

  async findOnePlain(slug: string) {
    const { images = [], ...product } = await this.findOne(slug);

    return {
      ...product,
      images: images.map((image) => image.url),
    };
  }

  /**
   * This TypeScript function updates a product with the provided data, including handling images and
   * transactions using a query runner.
   * @param {string} id - The `id` parameter in the `update` function is a string that represents the
   * unique identifier of the product that needs to be updated.
   * @param {UpdateProductDto} updateProductDto - The `updateProductDto` parameter is an object
   * containing the data to update a product. In the `async update` function, the code destructures
   * this object to extract the `images` property and the rest of the properties into the `toUpdate`
   * variable. The `images` property contains an
   * @returns The `findOnePlain(id)` method is being called and its return value is being returned from
   * the `update` method.
   */
  async update(id: string, updateProductDto: UpdateProductDto, user: User) {
    const { images, ...toUpdate } = updateProductDto;

    const product = await this.productRepository.preload({
      id,
      ...toUpdate,
    });

    if (!product) throw new NotFoundException(`Product #${id} not found`);

    // Query runner
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (images) {
        await queryRunner.manager.delete(ProductImage, { product: id });

        product.images = images.map((image) =>
          this.productImageRepository.create({ url: image }),
        );
      }
      product.user = user;
      await queryRunner.manager.save(product);

      await queryRunner.commitTransaction();
      await queryRunner.release();

      return this.findOnePlain(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
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

  async deleteAllProducts() {
    const query = this.productRepository.createQueryBuilder();

    try {
      return await query.delete().where({}).execute();
    } catch (error) {
      this.handleExceptions(error);
    }
  }
}
